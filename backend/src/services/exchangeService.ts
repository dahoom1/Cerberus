import ccxt from 'ccxt';
import { Server } from 'socket.io';
import { prisma } from '../index';
import { decrypt } from '../utils/encryption';

export interface ExchangeConfig {
  name: string;
  exchange: ccxt.Exchange;
  isConnected: boolean;
}

const exchanges: Map<string, ExchangeConfig> = new Map();

// Supported exchanges
const SUPPORTED_EXCHANGES = {
  BINANCE: 'binance',
  COINBASE: 'coinbase',
  KRAKEN: 'kraken',
  BYBIT: 'bybit',
  OKX: 'okx',
  BITFINEX: 'bitfinex',
  KUCOIN: 'kucoin',
  GATEIO: 'gate',
  HUOBI: 'huobi',
  BITGET: 'bitget',
};

export const getExchangeInstance = async (
  exchangeName: string,
  apiKey?: string,
  apiSecret?: string,
  passphrase?: string
): Promise<ccxt.Exchange | null> => {
  try {
    const ccxtExchangeName = SUPPORTED_EXCHANGES[exchangeName as keyof typeof SUPPORTED_EXCHANGES];
    if (!ccxtExchangeName) {
      throw new Error(`Unsupported exchange: ${exchangeName}`);
    }

    const ExchangeClass = ccxt[ccxtExchangeName as keyof typeof ccxt] as typeof ccxt.Exchange;
    if (!ExchangeClass) {
      throw new Error(`Exchange class not found: ${ccxtExchangeName}`);
    }

    const config: any = {
      enableRateLimit: true,
      options: {
        defaultType: 'spot', // or 'future' for perpetuals
      },
    };

    if (apiKey && apiSecret) {
      config.apiKey = apiKey;
      config.secret = apiSecret;
      if (passphrase) {
        config.password = passphrase;
      }
    }

    const exchange = new ExchangeClass(config);
    return exchange;
  } catch (error) {
    console.error(`Error creating exchange instance for ${exchangeName}:`, error);
    return null;
  }
};

export const initializeExchangeConnections = async (io: Server): Promise<void> => {
  console.log('Initializing exchange connections...');

  // Initialize public connections for all supported exchanges
  for (const [exchangeName, ccxtName] of Object.entries(SUPPORTED_EXCHANGES)) {
    try {
      const exchange = await getExchangeInstance(exchangeName);
      if (exchange) {
        exchanges.set(exchangeName, {
          name: exchangeName,
          exchange,
          isConnected: true,
        });
        console.log(`✓ Connected to ${exchangeName} (public)`);
      }
    } catch (error) {
      console.error(`✗ Failed to connect to ${exchangeName}:`, error);
    }
  }

  // Start market data streaming
  startMarketDataStreaming(io);
};

export const getUserExchangeInstance = async (
  userId: string,
  exchangeName: string
): Promise<ccxt.Exchange | null> => {
  try {
    const apiKeyRecord = await prisma.exchangeApiKey.findUnique({
      where: {
        userId_exchange: {
          userId,
          exchange: exchangeName as any,
        },
      },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      return null;
    }

    const apiKey = decrypt(apiKeyRecord.apiKey);
    const apiSecret = decrypt(apiKeyRecord.apiSecret);
    const passphrase = apiKeyRecord.passphrase ? decrypt(apiKeyRecord.passphrase) : undefined;

    return await getExchangeInstance(exchangeName, apiKey, apiSecret, passphrase);
  } catch (error) {
    console.error(`Error getting user exchange instance:`, error);
    return null;
  }
};

export const fetchOHLCV = async (
  exchangeName: string,
  symbol: string,
  timeframe: string = '1h',
  limit: number = 100
): Promise<ccxt.OHLCV[] | null> => {
  try {
    const exchangeConfig = exchanges.get(exchangeName);
    if (!exchangeConfig || !exchangeConfig.isConnected) {
      return null;
    }

    const ohlcv = await exchangeConfig.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
    return ohlcv;
  } catch (error) {
    console.error(`Error fetching OHLCV for ${exchangeName} ${symbol}:`, error);
    return null;
  }
};

export const fetchOrderBook = async (
  exchangeName: string,
  symbol: string,
  limit: number = 20
): Promise<ccxt.OrderBook | null> => {
  try {
    const exchangeConfig = exchanges.get(exchangeName);
    if (!exchangeConfig || !exchangeConfig.isConnected) {
      return null;
    }

    const orderBook = await exchangeConfig.exchange.fetchOrderBook(symbol, limit);
    return orderBook;
  } catch (error) {
    console.error(`Error fetching order book for ${exchangeName} ${symbol}:`, error);
    return null;
  }
};

export const fetchTicker = async (
  exchangeName: string,
  symbol: string
): Promise<ccxt.Ticker | null> => {
  try {
    const exchangeConfig = exchanges.get(exchangeName);
    if (!exchangeConfig || !exchangeConfig.isConnected) {
      return null;
    }

    const ticker = await exchangeConfig.exchange.fetchTicker(symbol);
    return ticker;
  } catch (error) {
    console.error(`Error fetching ticker for ${exchangeName} ${symbol}:`, error);
    return null;
  }
};

export const fetchFundingRate = async (
  exchangeName: string,
  symbol: string
): Promise<number | null> => {
  try {
    const exchangeConfig = exchanges.get(exchangeName);
    if (!exchangeConfig || !exchangeConfig.isConnected) {
      return null;
    }

    // Switch to futures market if needed
    if (exchangeConfig.exchange.has['fetchFundingRate']) {
      const fundingRate = await exchangeConfig.exchange.fetchFundingRate(symbol);
      return fundingRate.fundingRate || null;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching funding rate for ${exchangeName} ${symbol}:`, error);
    return null;
  }
};

export const fetchOpenInterest = async (
  exchangeName: string,
  symbol: string
): Promise<number | null> => {
  try {
    const exchangeConfig = exchanges.get(exchangeName);
    if (!exchangeConfig || !exchangeConfig.isConnected) {
      return null;
    }

    if (exchangeConfig.exchange.has['fetchOpenInterest']) {
      const openInterest = await exchangeConfig.exchange.fetchOpenInterest(symbol);
      return openInterest.openInterestAmount || null;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching open interest for ${exchangeName} ${symbol}:`, error);
    return null;
  }
};

export const fetchBalance = async (
  userId: string,
  exchangeName: string
): Promise<ccxt.Balances | null> => {
  try {
    const exchange = await getUserExchangeInstance(userId, exchangeName);
    if (!exchange) {
      return null;
    }

    const balance = await exchange.fetchBalance();
    return balance;
  } catch (error) {
    console.error(`Error fetching balance for ${exchangeName}:`, error);
    return null;
  }
};

const startMarketDataStreaming = (io: Server): void => {
  // Stream popular symbols
  const popularSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  setInterval(async () => {
    for (const [exchangeName, exchangeConfig] of exchanges.entries()) {
      if (!exchangeConfig.isConnected) continue;

      for (const symbol of popularSymbols) {
        try {
          // Fetch ticker
          const ticker = await fetchTicker(exchangeName, symbol);
          if (ticker) {
            io.emit('market-data', {
              exchange: exchangeName,
              symbol,
              type: 'ticker',
              data: ticker,
              timestamp: Date.now(),
            });
          }

          // Fetch order book
          const orderBook = await fetchOrderBook(exchangeName, symbol, 10);
          if (orderBook) {
            io.emit('market-data', {
              exchange: exchangeName,
              symbol,
              type: 'orderbook',
              data: orderBook,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          // Silently continue on errors
        }
      }
    }
  }, 5000); // Update every 5 seconds
};

export { exchanges };
