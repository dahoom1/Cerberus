import Parser from 'rss-parser';
import { prisma } from '../index';
import { analyzeSentiment } from './sentimentAnalysisService';

const rssParser = new Parser();

const NEWS_SOURCES = [
  {
    name: 'COINDESK',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  },
  {
    name: 'COINTELEGRAPH',
    url: 'https://cointelegraph.com/rss',
  },
];

/**
 * Scrape news from RSS feeds and analyze sentiment
 * Runs every 30 minutes as background job
 */
export const scrapeNews = async (): Promise<void> => {
  console.log('[News Scraper] Starting news scraping...');

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await rssParser.parseURL(source.url);
      console.log(`[News Scraper] Fetched ${feed.items.length} articles from ${source.name}`);

      for (const item of feed.items) {
        try {
          // Extract coin mentions from title and content
          const symbols = extractCoinSymbols(
            item.title + ' ' + (item.contentSnippet || '') + ' ' + (item.content || '')
          );

          if (symbols.length === 0) continue; // Skip if no coin mentioned

          // Analyze sentiment of headline
          const sentiment = analyzeSentiment([item.title || '']);

          // Calculate news importance score (0-100)
          const score = calculateNewsScore(item, sentiment);

          // Save for each mentioned coin
          for (const symbol of symbols) {
            try {
              await prisma.newsArticle.upsert({
                where: { url: item.link || '' },
                create: {
                  symbol,
                  title: item.title || '',
                  url: item.link || '',
                  source: source.name,
                  publishedAt: new Date(item.pubDate || Date.now()),
                  sentiment: sentiment.compound,
                  score,
                  summary: (item.contentSnippet || '').slice(0, 500),
                },
                update: {}, // Don't update if exists
              });
            } catch (error) {
              // Ignore duplicates (unique constraint on URL)
            }
          }
        } catch (error) {
          console.error(`Failed to process article from ${source.name}:`, error);
        }
      }

      console.log(`✓ Processed ${feed.items.length} articles from ${source.name}`);
    } catch (error) {
      console.error(`✗ Failed to scrape ${source.name}:`, error);
    }
  }

  console.log('[News Scraper] Completed news scraping');
};

/**
 * Extract coin symbols mentioned in text
 * Checks against tracked coins and common variations
 */
const extractCoinSymbols = (text: string): string[] => {
  const symbols = new Set<string>();
  const upperText = text.toUpperCase();

  // Define coin mappings (symbol and full names)
  const coinMappings: Record<string, string[]> = {
    BTC: ['BTC', 'BITCOIN', 'BITCOINS'],
    ETH: ['ETH', 'ETHEREUM', 'ETHER'],
    SOL: ['SOL', 'SOLANA'],
    XMR: ['XMR', 'MONERO'],
    HYPE: ['HYPE', 'HYPERLIQUID'],
    BNB: ['BNB', 'BINANCE COIN'],
    ADA: ['ADA', 'CARDANO'],
    DOT: ['DOT', 'POLKADOT'],
    MATIC: ['MATIC', 'POLYGON'],
    LINK: ['LINK', 'CHAINLINK'],
    AVAX: ['AVAX', 'AVALANCHE'],
    UNI: ['UNI', 'UNISWAP'],
    ATOM: ['ATOM', 'COSMOS'],
    LTC: ['LTC', 'LITECOIN'],
    XRP: ['XRP', 'RIPPLE'],
    DOGE: ['DOGE', 'DOGECOIN'],
    SHIB: ['SHIB', 'SHIBA INU'],
    TRX: ['TRX', 'TRON'],
    TON: ['TON', 'TONCOIN'],
    APT: ['APT', 'APTOS'],
  };

  // Check each coin's variations
  for (const [symbol, variations] of Object.entries(coinMappings)) {
    for (const variation of variations) {
      // Use word boundaries to avoid false matches
      const regex = new RegExp(`\\b${variation}\\b`, 'i');
      if (regex.test(upperText)) {
        symbols.add(symbol);
        break; // Found a match for this coin, move to next
      }
    }
  }

  return Array.from(symbols);
};

/**
 * Calculate news importance score (0-100)
 * Based on recency and sentiment extremity
 */
const calculateNewsScore = (item: any, sentiment: any): number => {
  let score = 50; // Base score

  // Recency boost (newer = higher score)
  const age = Date.now() - new Date(item.pubDate || Date.now()).getTime();
  const hoursOld = age / (1000 * 60 * 60);

  if (hoursOld < 1) score += 30; // Last hour
  else if (hoursOld < 6) score += 20; // Last 6 hours
  else if (hoursOld < 24) score += 10; // Last 24 hours

  // Sentiment extremity boost (strong sentiment = more important)
  const extremity = Math.abs(sentiment.compound);
  score += extremity * 20; // Up to +20

  return Math.min(score, 100);
};

/**
 * Get recent news for a specific coin
 */
export const getRecentNews = async (symbol: string, limit: number = 5) => {
  try {
    const news = await prisma.newsArticle.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: {
        score: 'desc', // Highest score first
      },
      take: limit,
    });

    return news;
  } catch (error) {
    console.error(`Failed to get news for ${symbol}:`, error);
    return [];
  }
};
