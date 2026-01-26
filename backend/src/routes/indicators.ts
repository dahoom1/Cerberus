import express from 'express';
import { query, validationResult } from 'express-validator';
import { calculateAllIndicators } from '../services/indicatorService';

const router = express.Router();

// Get all indicators for a symbol
router.get(
  '/',
  [
    query('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    query('symbol').notEmpty(),
    query('timeframe').optional().isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol, timeframe = '1h' } = req.query;

      const indicators = await calculateAllIndicators(
        exchange as string,
        symbol as string,
        timeframe as string
      );

      res.json({ indicators });
    } catch (error: any) {
      console.error('Calculate indicators error:', error);
      res.status(500).json({ error: error.message || 'Failed to calculate indicators' });
    }
  }
);

export default router;
