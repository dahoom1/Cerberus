import express from 'express';
import { query, param, validationResult } from 'express-validator';
import { prisma } from '../index';
import { detectWhalePattern, aggregateWhaleActivity } from '../services/whaleAnalysisService';

const router = express.Router();

// GET /api/whale/transactions - Fetch whale transactions with filters
router.get(
  '/transactions',
  [
    query('symbol').optional(),
    query('blockchain').optional(),
    query('transactionType').optional()
      .isIn(['exchange_inflow', 'exchange_outflow', 'whale_movement', 'exchange_to_exchange']),
    query('minAmount').optional().isFloat({ min: 0 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        symbol,
        blockchain,
        transactionType,
        minAmount,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const where: any = {};
      if (symbol) where.symbol = symbol;
      if (blockchain) where.blockchain = blockchain;
      if (transactionType) where.transactionType = transactionType;
      if (minAmount) where.amountUsd = { gte: parseFloat(minAmount as string) };
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate as string);
        if (endDate) where.timestamp.lte = new Date(endDate as string);
      }

      const [transactions, total] = await Promise.all([
        prisma.whaleTransaction.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit as number,
          skip: offset as number,
        }),
        prisma.whaleTransaction.count({ where }),
      ]);

      res.json({
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: (offset as number) + (limit as number) < total,
        }
      });
    } catch (error: any) {
      console.error('Get whale transactions error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch whale transactions' });
    }
  }
);

// GET /api/whale/summary - Aggregate whale activity
router.get(
  '/summary',
  [
    query('symbol').notEmpty(),
    query('timeframe').optional().isIn(['1h', '24h', '7d']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { symbol, timeframe = '24h' } = req.query;

      const summary = await aggregateWhaleActivity(
        symbol as string,
        timeframe as '1h' | '24h' | '7d'
      );

      res.json({ summary });
    } catch (error: any) {
      console.error('Get whale summary error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch summary' });
    }
  }
);

// GET /api/whale/analysis/:symbol - Pattern detection
router.get(
  '/analysis/:symbol',
  [
    param('symbol').notEmpty(),
    query('hours').optional().isInt({ min: 1, max: 168 }).toInt(),
  ],
  async (req, res) => {
    try {
      const { symbol } = req.params;
      const { hours = 24 } = req.query;

      const pattern = await detectWhalePattern(symbol, hours as number);

      res.json({ symbol, analysis: pattern });
    } catch (error: any) {
      console.error('Get whale analysis error:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze patterns' });
    }
  }
);

// GET /api/whale/wallets - List known whale/exchange wallets
router.get(
  '/wallets',
  [
    query('blockchain').optional(),
    query('ownerType').optional().isIn(['exchange', 'whale', 'custodian', 'miner']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { blockchain, ownerType, limit = 50 } = req.query;

      const where: any = {};
      if (blockchain) where.blockchain = blockchain;
      if (ownerType) where.ownerType = ownerType;

      const wallets = await prisma.whaleWallet.findMany({
        where,
        orderBy: { lastSeen: 'desc' },
        take: limit as number,
      });

      res.json({ wallets });
    } catch (error: any) {
      console.error('Get whale wallets error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch whale wallets' });
    }
  }
);

export default router;
