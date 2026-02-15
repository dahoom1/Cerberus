import axios from 'axios';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;      // In crypto units
  amountUsd: number;
  timestamp: Date;
  blockNumber?: number;
  confirmations?: number;
}

// Bitcoin via Blockchain.com API (no key required)
export const fetchBitcoinTransactions = async (
  minAmountBTC: number = 100  // ~$5M at $50k/BTC
): Promise<Transaction[]> => {
  try {
    // Get latest blocks
    const response = await axios.get(
      'https://blockchain.info/blocks?format=json',
      { timeout: 10000 }
    );

    const latestBlocks = response.data.slice(0, 3); // Last 3 blocks
    const transactions: Transaction[] = [];

    for (const block of latestBlocks) {
      try {
        const blockData = await axios.get(
          `https://blockchain.info/rawblock/${block.hash}?format=json`,
          { timeout: 10000 }
        );

        for (const tx of blockData.data.tx || []) {
          // Calculate total output in BTC
          const totalBTC = tx.out.reduce((sum: number, output: any) =>
            sum + (output.value / 100000000), 0
          );

          if (totalBTC >= minAmountBTC) {
            // Get current BTC price for USD conversion
            const btcPrice = await getBitcoinPrice();

            transactions.push({
              hash: tx.hash,
              from: tx.inputs[0]?.prev_out?.addr || 'Unknown',
              to: tx.out[0]?.addr || 'Unknown',
              amount: totalBTC,
              amountUsd: totalBTC * btcPrice,
              timestamp: new Date(tx.time * 1000),
              blockNumber: block.height,
              confirmations: tx.confirmations || 0,
            });
          }
        }
      } catch (blockError) {
        console.error(`Failed to fetch block ${block.hash}:`, blockError);
        continue;
      }
    }

    return transactions;
  } catch (error) {
    console.error('Bitcoin API error:', error);
    return [];
  }
};

// Ethereum/Multi-chain via BlockCypher API (free tier: 200 req/hour)
export const fetchEthereumTransactions = async (
  minAmountETH: number = 1000  // ~$5M at $5k/ETH
): Promise<Transaction[]> => {
  try {
    const response = await axios.get(
      'https://api.blockcypher.com/v1/eth/main',
      { timeout: 10000 }
    );

    const latestBlock = response.data.height;
    const transactions: Transaction[] = [];

    // Fetch last 2 blocks
    for (let i = 0; i < 2; i++) {
      try {
        const blockData = await axios.get(
          `https://api.blockcypher.com/v1/eth/main/blocks/${latestBlock - i}?txstart=0&limit=50`,
          { timeout: 10000 }
        );

        for (const tx of blockData.data.txs || []) {
          const amountETH = tx.total / 1e18; // Wei to ETH

          if (amountETH >= minAmountETH) {
            const ethPrice = await getEthereumPrice();

            transactions.push({
              hash: tx.hash,
              from: tx.inputs[0]?.addresses[0] || 'Unknown',
              to: tx.outputs[0]?.addresses[0] || 'Unknown',
              amount: amountETH,
              amountUsd: amountETH * ethPrice,
              timestamp: new Date(tx.confirmed),
              confirmations: tx.confirmations || 0,
            });
          }
        }
      } catch (blockError) {
        console.error(`Failed to fetch block ${latestBlock - i}:`, blockError);
        continue;
      }
    }

    return transactions;
  } catch (error) {
    console.error('Ethereum API error:', error);
    return [];
  }
};

// Price fetching (cache for 1 minute to avoid excessive API calls)
let btcPriceCache: { price: number; timestamp: number } | null = null;
let ethPriceCache: { price: number; timestamp: number } | null = null;

export const getBitcoinPrice = async (): Promise<number> => {
  if (btcPriceCache && Date.now() - btcPriceCache.timestamp < 60000) {
    return btcPriceCache.price;
  }

  try {
    const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
      timeout: 5000,
    });
    const price = parseFloat(response.data.data.amount);
    btcPriceCache = { price, timestamp: Date.now() };
    return price;
  } catch (error) {
    console.error('Failed to fetch BTC price:', error);
    // Return cached price if available, otherwise default
    return btcPriceCache?.price || 50000;
  }
};

export const getEthereumPrice = async (): Promise<number> => {
  if (ethPriceCache && Date.now() - ethPriceCache.timestamp < 60000) {
    return ethPriceCache.price;
  }

  try {
    const response = await axios.get('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      timeout: 5000,
    });
    const price = parseFloat(response.data.data.amount);
    ethPriceCache = { price, timestamp: Date.now() };
    return price;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    // Return cached price if available, otherwise default
    return ethPriceCache?.price || 3500;
  }
};

// Get price for any supported symbol
export const getCryptoPrice = async (symbol: string): Promise<number> => {
  switch (symbol.toUpperCase()) {
    case 'BTC':
      return getBitcoinPrice();
    case 'ETH':
      return getEthereumPrice();
    case 'BNB':
    case 'SOL':
    case 'XRP':
      // For other coins, use Coinbase API
      try {
        const response = await axios.get(
          `https://api.coinbase.com/v2/prices/${symbol.toUpperCase()}-USD/spot`,
          { timeout: 5000 }
        );
        return parseFloat(response.data.data.amount);
      } catch (error) {
        console.error(`Failed to fetch ${symbol} price:`, error);
        return 0;
      }
    default:
      return 0;
  }
};
