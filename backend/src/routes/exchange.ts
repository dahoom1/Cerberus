import express from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  fetchOHLCV,
  fetchOrderBook,
  fetchTicker,
  fetchFundingRate,
  fetchOpenInterest,
  fetchBalance,
  getUserExchangeInstance,
} from '../services/exchangeService';

const router = express.Router();

// Get OHLCV data
router.get(
  '/ohlcv',
  [
    query('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    query('symbol').notEmpty(),
    query('timeframe').optional().isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d']),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol, timeframe = '1h', limit = 100 } = req.query;

      const ohlcv = await fetchOHLCV(
        exchange as string,
        symbol as string,
        timeframe as string,
        parseInt(limit as string)
      );

      if (!ohlcv) {
        return res.status(404).json({ error: 'Data not available' });
      }

      res.json({ ohlcv });
    } catch (error) {
      console.error('Fetch OHLCV error:', error);
      res.status(500).json({ error: 'Failed to fetch OHLCV data' });
    }
  }
);

// Get order book
router.get(
  '/orderbook',
  [
    query('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    query('symbol').notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol, limit = 20 } = req.query;

      const orderBook = await fetchOrderBook(
        exchange as string,
        symbol as string,
        parseInt(limit as string)
      );

      if (!orderBook) {
        return res.status(404).json({ error: 'Data not available' });
      }

      res.json({ orderBook });
    } catch (error) {
      console.error('Fetch order book error:', error);
      res.status(500).json({ error: 'Failed to fetch order book' });
    }
  }
);

// Get ticker
router.get(
  '/ticker',
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

      const ticker = await fetchTicker(exchange as string, symbol as string);

      if (!ticker) {
        return res.status(404).json({ error: 'Data not available' });
      }

      res.json({ ticker });
    } catch (error) {
      console.error('Fetch ticker error:', error);
      res.status(500).json({ error: 'Failed to fetch ticker' });
    }
  }
);

// Get funding rate
router.get(
  '/funding-rate',
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

      const fundingRate = await fetchFundingRate(exchange as string, symbol as string);

      if (fundingRate === null) {
        return res.status(404).json({ error: 'Funding rate not available' });
      }

      res.json({ fundingRate });
    } catch (error) {
      console.error('Fetch funding rate error:', error);
      res.status(500).json({ error: 'Failed to fetch funding rate' });
    }
  }
);

// Get open interest
router.get(
  '/open-interest',
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

      const openInterest = await fetchOpenInterest(exchange as string, symbol as string);

      if (openInterest === null) {
        return res.status(404).json({ error: 'Open interest not available' });
      }

      res.json({ openInterest });
    } catch (error) {
      console.error('Fetch open interest error:', error);
      res.status(500).json({ error: 'Failed to fetch open interest' });
    }
  }
);

// Get balance (requires authentication)
router.get(
  '/balance',
  authenticate,
  [
    query('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange } = req.query;

      const balance = await fetchBalance(req.userId!, exchange as string);

      if (!balance) {
        return res.status(404).json({ error: 'Balance not available. Please check your API keys.' });
      }

      res.json({ balance });
    } catch (error) {
      console.error('Fetch balance error:', error);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  }
);

export default router;
