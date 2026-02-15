import express from 'express';
import { query, body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import { calculateAllIndicators } from '../services/indicatorService';
import { detectLiquidationZones } from '../services/liquidationService';

const router = express.Router();

// Generate trading signal based on indicators
router.post(
  '/generate',
  authenticate,
  [
    body('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    body('symbol').notEmpty(),
    body('timeframe').optional().isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, symbol, timeframe = '1h' } = req.body;

      // Calculate all indicators
      const indicators = await calculateAllIndicators(exchange, symbol, timeframe);

      // Get latest values
      const latestRSI = indicators.rsi[indicators.rsi.length - 1];
      const latestMACD = indicators.macd[indicators.macd.length - 1];
      const latestStochastic = indicators.stochastic[indicators.stochastic.length - 1];
      const latestADX = indicators.adx[indicators.adx.length - 1];
      const latestPrice = indicators.sma20[indicators.sma20.length - 1];

      // Simple signal generation logic (can be enhanced with ML)
      let signalType = 'HOLD';
      let confidence = 0;
      const reasons: string[] = [];

      // RSI signals
      if (latestRSI < 30) {
        signalType = 'BUY';
        confidence += 25;
        reasons.push('RSI oversold');
      } else if (latestRSI > 70) {
        signalType = 'SELL';
        confidence += 25;
        reasons.push('RSI overbought');
      }

      // MACD signals
      if (latestMACD.MACD > latestMACD.signal && latestMACD.histogram > 0) {
        if (signalType === 'HOLD') signalType = 'BUY';
        confidence += 20;
        reasons.push('MACD bullish crossover');
      } else if (latestMACD.MACD < latestMACD.signal && latestMACD.histogram < 0) {
        if (signalType === 'HOLD') signalType = 'SELL';
        confidence += 20;
        reasons.push('MACD bearish crossover');
      }

      // Stochastic signals
      if (latestStochastic.k < 20 && latestStochastic.d < 20) {
        if (signalType === 'BUY') confidence += 15;
        reasons.push('Stochastic oversold');
      } else if (latestStochastic.k > 80 && latestStochastic.d > 80) {
        if (signalType === 'SELL') confidence += 15;
        reasons.push('Stochastic overbought');
      }

      // ADX trend strength
      if (latestADX > 25) {
        confidence += 10;
        reasons.push('Strong trend (ADX > 25)');
      }

      // Moving average alignment
      const sma20 = indicators.sma20[indicators.sma20.length - 1];
      const sma50 = indicators.sma50[indicators.sma50.length - 1];
      if (sma20 > sma50) {
        if (signalType === 'BUY') confidence += 10;
        reasons.push('Bullish MA alignment');
      } else {
        if (signalType === 'SELL') confidence += 10;
        reasons.push('Bearish MA alignment');
      }

      // Check liquidation zones
      const liquidationZones = await detectLiquidationZones(exchange, symbol);
      if (liquidationZones.length > 0) {
        reasons.push(`${liquidationZones.length} liquidation zone(s) detected`);
      }

      const technicalConfidence = Math.min(confidence, 100);

      // ===== SENTIMENT & NEWS INTEGRATION =====

      // 1. Get latest Twitter sentiment (last hour)
      const baseSymbol = symbol.split('/')[0]; // Extract BTC from BTC/USDT
      const sentimentData = await prisma.sentimentData.findFirst({
        where: {
          symbol: baseSymbol,
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      // 2. Get recent news (last 24 hours)
      const recentNews = await prisma.newsArticle.findMany({
        where: {
          symbol: baseSymbol,
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { score: 'desc' },
        take: 5,
      });

      // 3. Calculate sentiment contribution (up to +15)
      let sentimentBonus = 0;
      let inverseSentiment = 0;
      if (sentimentData) {
        // Positive sentiment boosts BUY, negative boosts SELL
        if (signalType === 'BUY' && sentimentData.sentiment > 0.3) {
          sentimentBonus = sentimentData.sentiment * 15; // Max +15
        } else if (signalType === 'SELL' && sentimentData.sentiment < -0.3) {
          sentimentBonus = Math.abs(sentimentData.sentiment) * 15; // Max +15
        }

        inverseSentiment = sentimentData.inverseSentiment;

        reasons.push(
          `Social sentiment: ${(sentimentData.sentiment * 100).toFixed(0)}% ` +
          `(${sentimentData.volume} posts)`
        );

        if (Math.abs(inverseSentiment) > 0.1) {
          reasons.push(
            `Contrarian indicator: ${(inverseSentiment * 100).toFixed(0)}%`
          );
        }
      }

      // 4. Calculate news contribution (up to +15)
      let newsBonus = 0;
      let newsScore = 0;
      if (recentNews.length > 0) {
        // Weighted average of news sentiment by importance score
        const weightedSentiment = recentNews.reduce(
          (sum, article) => sum + (article.sentiment * article.score), 0
        ) / recentNews.reduce((sum, article) => sum + article.score, 0);

        newsScore = recentNews[0].score; // Highest score

        if (signalType === 'BUY' && weightedSentiment > 0.2) {
          newsBonus = Math.abs(weightedSentiment) * newsScore * 0.15; // Max +15
        } else if (signalType === 'SELL' && weightedSentiment < -0.2) {
          newsBonus = Math.abs(weightedSentiment) * newsScore * 0.15; // Max +15
        }

        reasons.push(
          `Latest news: ${recentNews[0].title.slice(0, 80)}...`
        );
      }

      // 5. Final confidence: 70% technical + 15% sentiment + 15% news
      const finalConfidence = Math.min(
        technicalConfidence + sentimentBonus + newsBonus,
        100
      );

      // Save signal to database with sentiment/news data
      const signal = await prisma.tradingSignal.create({
        data: {
          userId: req.userId,
          symbol,
          exchange: exchange as any,
          signalType,
          confidence: finalConfidence,
          price: latestPrice,
          indicators: indicators as any,
          reason: reasons.join('; '),
          sentimentScore: sentimentData?.sentiment,
          inverseSentiment,
          newsScore,
          sentimentWeight: sentimentBonus,
          newsWeight: newsBonus,
        },
      });

      // Create performance tracker
      await prisma.signalPerformance.create({
        data: {
          signalId: signal.id,
          currentPrice: latestPrice,
          currentPnL: 0,
          highestPrice: latestPrice,
          lowestPrice: latestPrice,
        },
      });

      res.json({ signal });
    } catch (error: any) {
      console.error('Generate signal error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate signal' });
    }
  }
);

// Get user's trading signals
router.get(
  '/',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('symbol').optional(),
    query('exchange').optional(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const { limit = 50, symbol, exchange } = req.query;

      const where: any = { userId: req.userId };
      if (symbol) where.symbol = symbol;
      if (exchange) where.exchange = exchange;

      const signals = await prisma.tradingSignal.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: parseInt(limit as string),
        include: {
          performance: true, // Include performance data
        },
      });

      res.json({ signals });
    } catch (error) {
      console.error('Get signals error:', error);
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  }
);

export default router;
