import express from 'express';
import { param } from 'express-validator';
import { prisma } from '../index';

const router = express.Router();

/**
 * GET /api/sentiment/:symbol
 * Get latest sentiment data for a coin (Twitter + News)
 */
router.get(
  '/:symbol',
  param('symbol').notEmpty(),
  async (req, res) => {
    try {
      const { symbol } = req.params;

      // Get latest Twitter sentiment
      const twitter = await prisma.sentimentData.findFirst({
        where: {
          symbol: symbol.toUpperCase(),
          source: 'TWITTER',
        },
        orderBy: { timestamp: 'desc' },
      });

      // Get recent news (last 24 hours)
      const news = await prisma.newsArticle.findMany({
        where: {
          symbol: symbol.toUpperCase(),
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { score: 'desc' },
        take: 5,
      });

      res.json({
        symbol: symbol.toUpperCase(),
        twitter: twitter ? {
          sentiment: twitter.sentiment,
          inverse: twitter.inverseSentiment,
          volume: twitter.volume,
          timestamp: twitter.timestamp,
        } : null,
        news: news.map(n => ({
          title: n.title,
          url: n.url,
          source: n.source,
          sentiment: n.sentiment,
          score: n.score,
          publishedAt: n.publishedAt,
        })),
      });
    } catch (error) {
      console.error('Get sentiment error:', error);
      res.status(500).json({ error: 'Failed to fetch sentiment data' });
    }
  }
);

export default router;
