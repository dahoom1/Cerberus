import express from 'express';
import { param } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = express.Router();

/**
 * GET /api/performance/:signalId
 * Get performance data for a specific signal
 */
router.get(
  '/:signalId',
  authenticate,
  param('signalId').notEmpty(),
  async (req: AuthRequest, res) => {
    try {
      const { signalId } = req.params;

      const performance = await prisma.signalPerformance.findUnique({
        where: { signalId },
        include: {
          signal: {
            select: {
              symbol: true,
              exchange: true,
              signalType: true,
              confidence: true,
              price: true,
              timestamp: true,
            },
          },
        },
      });

      if (!performance) {
        return res.status(404).json({ error: 'Performance data not found' });
      }

      // Check if signal belongs to user
      const signal = await prisma.tradingSignal.findUnique({
        where: { id: signalId },
        select: { userId: true },
      });

      if (signal?.userId !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json(performance);
    } catch (error) {
      console.error('Get performance error:', error);
      res.status(500).json({ error: 'Failed to fetch performance data' });
    }
  }
);

/**
 * GET /api/performance/stats/overall
 * Get overall performance statistics for the authenticated user
 */
router.get(
  '/stats/overall',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId;

      // Count signals by performance tier
      const stats = await prisma.signalPerformance.groupBy({
        by: ['performanceTier'],
        where: {
          signal: {
            userId,
          },
          performanceTier: {
            not: null,
          },
        },
        _count: true,
        _avg: {
          accuracyScore: true,
        },
      });

      // Total signals
      const totalSignals = await prisma.tradingSignal.count({
        where: { userId },
      });

      // Average P&L
      const avgPnL = await prisma.signalPerformance.aggregate({
        where: {
          signal: {
            userId,
          },
          currentPnL: {
            not: null,
          },
        },
        _avg: {
          currentPnL: true,
        },
      });

      res.json({
        totalSignals,
        averagePnL: avgPnL._avg.currentPnL || 0,
        byTier: stats.map(s => ({
          tier: s.performanceTier,
          count: s._count,
          avgAccuracy: s._avg.accuracyScore,
        })),
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

export default router;
