import axios from 'axios';
import { prisma } from '../index';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

/**
 * Update top 20 coins by market cap from CoinGecko
 * Runs daily to keep rankings fresh
 */
export const updateTopCoins = async (): Promise<void> => {
  try {
    const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 20,
        page: 1,
        sparkline: false,
      },
      timeout: 10000,
    });

    for (const coin of response.data) {
      await prisma.topCoin.upsert({
        where: { symbol: coin.symbol.toUpperCase() },
        create: {
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          marketCapRank: coin.market_cap_rank,
          marketCap: coin.market_cap,
        },
        update: {
          marketCapRank: coin.market_cap_rank,
          marketCap: coin.market_cap,
          lastUpdated: new Date(),
        },
      });
    }

    console.log(`✓ Updated top 20 coins by market cap from CoinGecko`);
  } catch (error) {
    console.error('Failed to update top coins:', error);
  }
};

/**
 * Get list of all coins to track for sentiment
 * Includes priority coins + top 20 by market cap
 */
export const getTrackedCoins = async (): Promise<string[]> => {
  // Hardcoded priority coins (always track these)
  const priority = ['BTC', 'ETH', 'SOL', 'XMR', 'HYPE'];

  try {
    // Top 20 by market cap from database
    const topCoins = await prisma.topCoin.findMany({
      orderBy: { marketCapRank: 'asc' },
      take: 20,
    });

    // Combine and deduplicate
    const allCoins = [...new Set([...priority, ...topCoins.map(c => c.symbol)])];
    return allCoins;
  } catch (error) {
    console.error('Failed to fetch tracked coins, using priority list only:', error);
    return priority;
  }
};

/**
 * Get coin information by symbol
 */
export const getCoinInfo = async (symbol: string): Promise<any> => {
  try {
    const coin = await prisma.topCoin.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    return coin;
  } catch (error) {
    console.error(`Failed to get info for ${symbol}:`, error);
    return null;
  }
};
