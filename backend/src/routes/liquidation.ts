import express from 'express';
import { query, validationResult } from 'express-validator';
import {
  detectLiquidationZones,
  monitorLiquidationZones,
} from '../services/liquidationService';
import { prisma } from '../index';

const router = express.Router();

// Detect liquidation zones
router.get(
  '/zones',
  [
    query('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    query('symbol').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol } = req.query;

      const zones = await detectLiquidationZones(
        exchange as string,
        symbol as string
      );

      res.json({ zones });
    } catch (error: any) {
      console.error('Detect liquidation zones error:', error);
      res.status(500).json({ error: error.message || 'Failed to detect liquidation zones' });
    }
  }
);

// Get historical liquidation zones
router.get(
  '/history',
  [
    query('exchange').optional().isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    query('symbol').optional(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol, limit = 50 } = req.query;

      const where: any = {};
      if (exchange) where.exchange = exchange;
      if (symbol) where.symbol = symbol;

      const zones = await prisma.liquidationZone.findMany({
        where,
        orderBy: {
          detectedAt: 'desc',
        },
        take: parseInt(limit as string),
      });

      res.json({ zones });
    } catch (error) {
      console.error('Get liquidation history error:', error);
      res.status(500).json({ error: 'Failed to fetch liquidation history' });
    }
  }
);

// Monitor liquidation zones (triggers monitoring and returns alerts)
router.post(
  '/monitor',
  [
    query('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    query('symbol').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol } = req.query;

      const alerts = await monitorLiquidationZones(
        exchange as string,
        symbol as string
      );

      res.json({ alerts });
    } catch (error: any) {
      console.error('Monitor liquidation zones error:', error);
      res.status(500).json({ error: error.message || 'Failed to monitor liquidation zones' });
    }
  }
);

export default router;
