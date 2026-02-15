import { prisma } from '../index';

// Aggregate whale activity for a symbol
export const aggregateWhaleActivity = async (
  symbol: string,
  timeframe: '1h' | '24h' | '7d'
): Promise<any> => {
  const timeMs = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  }[timeframe];

  const periodStart = new Date(Date.now() - timeMs);
  const periodEnd = new Date();

  // Get all transactions in timeframe
  const transactions = await prisma.whaleTransaction.findMany({
    where: {
      symbol,
      timestamp: { gte: periodStart, lte: periodEnd },
    },
  });

  // Calculate metrics
  let exchangeInflow = 0;
  let exchangeOutflow = 0;
  let inflowTxCount = 0;
  let outflowTxCount = 0;
  let largestTxAmount = 0;
  let largestTxHash = '';

  for (const tx of transactions) {
    if (tx.transactionType === 'exchange_inflow') {
      exchangeInflow += tx.amountUsd;
      inflowTxCount++;
    } else if (tx.transactionType === 'exchange_outflow') {
      exchangeOutflow += tx.amountUsd;
      outflowTxCount++;
    }

    if (tx.amountUsd > largestTxAmount) {
      largestTxAmount = tx.amountUsd;
      largestTxHash = tx.txHash;
    }
  }

  const netFlow = exchangeOutflow - exchangeInflow;

  // Store summary
  const summary = await prisma.whaleActivitySummary.upsert({
    where: {
      symbol_timeframe_periodStart: {
        symbol,
        timeframe,
        periodStart,
      },
    },
    create: {
      symbol,
      timeframe,
      exchangeInflow,
      exchangeOutflow,
      netFlow,
      inflowTxCount,
      outflowTxCount,
      largestTxAmount,
      largestTxHash,
      periodStart,
      periodEnd,
    },
    update: {
      exchangeInflow,
      exchangeOutflow,
      netFlow,
      inflowTxCount,
      outflowTxCount,
      largestTxAmount,
      largestTxHash,
      periodEnd,
    },
  });

  return summary;
};

// Detect accumulation/distribution pattern
export const detectWhalePattern = async (
  symbol: string,
  hours: number = 24
): Promise<{
  pattern: 'accumulation' | 'distribution' | 'neutral';
  confidence: number;
  netFlow: number;
  reasoning: string[];
}> => {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const transactions = await prisma.whaleTransaction.findMany({
    where: {
      symbol,
      timestamp: { gte: cutoff },
    },
  });

  let inflow = 0;
  let outflow = 0;

  for (const tx of transactions) {
    if (tx.transactionType === 'exchange_inflow') inflow += tx.amountUsd;
    if (tx.transactionType === 'exchange_outflow') outflow += tx.amountUsd;
  }

  const netFlow = outflow - inflow;
  const totalVolume = inflow + outflow;
  const ratio = totalVolume > 0 ? netFlow / totalVolume : 0;

  const reasoning: string[] = [];

  // Determine pattern
  let pattern: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
  let confidence = 0;

  if (ratio > 0.3) {
    pattern = 'accumulation';
    confidence = Math.min(ratio * 100, 100);
    reasoning.push(`Strong outflow from exchanges ($${(outflow / 1000000).toFixed(1)}M)`);
    reasoning.push('Whales withdrawing to cold storage - bullish accumulation');
  } else if (ratio < -0.3) {
    pattern = 'distribution';
    confidence = Math.min(Math.abs(ratio) * 100, 100);
    reasoning.push(`Strong inflow to exchanges ($${(inflow / 1000000).toFixed(1)}M)`);
    reasoning.push('Whales moving to exchanges - potential sell pressure');
  } else {
    reasoning.push('Balanced whale activity - no clear directional bias');
  }

  return { pattern, confidence, netFlow, reasoning };
};

// Aggregate all monitored symbols
export const aggregateAllWhaleActivity = async (): Promise<void> => {
  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
  const timeframes: ('1h' | '24h' | '7d')[] = ['1h', '24h', '7d'];

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      try {
        await aggregateWhaleActivity(symbol, timeframe);
      } catch (error) {
        console.error(`Failed to aggregate ${symbol} ${timeframe}:`, error);
      }
    }
  }

  console.log('✓ Whale activity aggregation complete');
};
