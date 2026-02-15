import axios from 'axios';
import Parser from 'rss-parser';
import { prisma } from '../index';
import { analyzeSentiment, getCoinName } from './sentimentAnalysisService';
import { getTrackedCoins } from './marketCapService';

const rssParser = new Parser();

export interface TweetData {
  text: string;
  timestamp: Date;
  likes: number;
  retweets: number;
}

// Nitter instance pool (fallback if one fails)
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.1d4.us',
  'https://nitter.kavin.rocks',
  'https://nitter.privacydev.net',
];

/**
 * Scrape tweets for a specific coin symbol
 * Uses Nitter RSS feeds (free, no API key required)
 */
export const scrapeTweetsForSymbol = async (
  symbol: string,
  limit: number = 100
): Promise<TweetData[]> => {
  const coinName = getCoinName(symbol);
  const searchQuery = `$${symbol} OR #${symbol} OR ${coinName}`;

  for (const instance of NITTER_INSTANCES) {
    try {
      // Build Nitter search RSS URL
      const rssUrl = `${instance}/search/rss?f=tweets&q=${encodeURIComponent(searchQuery)}`;

      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      // Parse RSS feed
      const feed = await rssParser.parseString(response.data);
      const tweets: TweetData[] = [];

      for (const item of feed.items.slice(0, limit)) {
        tweets.push({
          text: item.content || item.title || '',
          timestamp: new Date(item.pubDate || Date.now()),
          likes: 0, // Not available in RSS
          retweets: 0, // Not available in RSS
        });
      }

      console.log(`✓ Scraped ${tweets.length} tweets for ${symbol} from ${instance}`);
      return tweets;
    } catch (error) {
      console.warn(`Nitter instance ${instance} failed for ${symbol}, trying next...`);
      continue;
    }
  }

  // All instances failed
  console.error(`All Nitter instances failed for ${symbol}`);
  return [];
};

/**
 * Scrape sentiment for all tracked coins
 * Runs every 15 minutes as background job
 */
export const scrapeAllCoinsSentiment = async (): Promise<void> => {
  console.log('[Twitter Scraper] Starting sentiment scraping for all coins...');

  try {
    // Get list of coins to track
    const coins = await getTrackedCoins();
    console.log(`[Twitter Scraper] Tracking ${coins.length} coins: ${coins.join(', ')}`);

    for (const symbol of coins) {
      try {
        const tweets = await scrapeTweetsForSymbol(symbol, 100);

        if (tweets.length > 0) {
          // Analyze sentiment using VADER
          const sentiment = analyzeSentiment(tweets.map(t => t.text));

          // Store in database
          await prisma.sentimentData.create({
            data: {
              symbol,
              source: 'TWITTER',
              sentiment: sentiment.compound,
              inverseSentiment: sentiment.inverse,
              volume: tweets.length,
              rawData: tweets.slice(0, 10) as any, // Save sample tweets
            },
          });

          console.log(
            `✓ ${symbol}: Sentiment ${(sentiment.compound * 100).toFixed(0)}%, ` +
            `Inverse ${(sentiment.inverse * 100).toFixed(0)}% (${tweets.length} tweets)`
          );
        } else {
          console.log(`⚠ ${symbol}: No tweets found, skipping`);
        }
      } catch (error) {
        console.error(`✗ Failed to scrape ${symbol}:`, error);
      }

      // Rate limiting: 2 second delay between coins to avoid overwhelming Nitter
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('[Twitter Scraper] Completed sentiment scraping');
  } catch (error) {
    console.error('[Twitter Scraper] Failed:', error);
  }
};

/**
 * Get latest Twitter sentiment for a specific coin
 */
export const getLatestSentiment = async (symbol: string) => {
  try {
    const sentiment = await prisma.sentimentData.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
        source: 'TWITTER',
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return sentiment;
  } catch (error) {
    console.error(`Failed to get sentiment for ${symbol}:`, error);
    return null;
  }
};
