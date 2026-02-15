import { Server } from 'socket.io';
import { prisma } from '../index';
import { fetchBitcoinTransactions, fetchEthereumTransactions } from './blockchainApiClient';

// Configuration
const WHALE_CONFIG = {
  minTransactionUsd: 5000000,  // $5M threshold
  pollInterval: 60000,         // 60 seconds
  monitoredChains: ['bitcoin', 'ethereum'],

  significanceThresholds: {
    critical: 50000000,  // $50M+
    high: 20000000,      // $20M+
    medium: 10000000,    // $10M+
    low: 5000000,        // $5M+
  },
};

// Main monitoring function
export const monitorWhaleTransactions = async (): Promise<any[]> => {
  const newTransactions: any[] = [];

  try {
    // Fetch Bitcoin transactions
    const btcTxs = await fetchBitcoinTransactions(100); // ~$5M at $50k

    for (const tx of btcTxs) {
      if (tx.amountUsd < WHALE_CONFIG.minTransactionUsd) continue;

      // Check if already stored
      const existing = await prisma.whaleTransaction.findUnique({
        where: { txHash: tx.hash },
      });

      if (existing) continue;

      // Identify wallet types
      const fromWallet = await identifyWallet(tx.from, 'bitcoin');
      const toWallet = await identifyWallet(tx.to, 'bitcoin');

      // Classify transaction type
      const transactionType = classifyTransaction(fromWallet, toWallet);
      const significance = calculateSignificance(tx.amountUsd);

      // Store in database
      const saved = await prisma.whaleTransaction.create({
        data: {
          txHash: tx.hash,
          blockchain: 'bitcoin',
          symbol: 'BTC',
          amount: tx.amount,
          amountUsd: tx.amountUsd,
          fromAddress: tx.from,
          fromOwner: fromWallet?.ownerName,
          fromType: fromWallet?.ownerType,
          toAddress: tx.to,
          toOwner: toWallet?.ownerName,
          toType: toWallet?.ownerType,
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber,
          confirmations: tx.confirmations,
          transactionType,
          significance,
          source: 'blockchain-api',
        },
      });

      newTransactions.push(saved);
      console.log(`✓ Whale BTC transaction detected: ${(tx.amountUsd / 1000000).toFixed(1)}M USD - ${transactionType}`);
    }

    // Fetch Ethereum transactions
    const ethTxs = await fetchEthereumTransactions(1000); // ~$5M at $5k

    for (const tx of ethTxs) {
      if (tx.amountUsd < WHALE_CONFIG.minTransactionUsd) continue;

      // Check if already stored
      const existing = await prisma.whaleTransaction.findUnique({
        where: { txHash: tx.hash },
      });

      if (existing) continue;

      // Identify wallet types
      const fromWallet = await identifyWallet(tx.from, 'ethereum');
      const toWallet = await identifyWallet(tx.to, 'ethereum');

      // Classify transaction type
      const transactionType = classifyTransaction(fromWallet, toWallet);
      const significance = calculateSignificance(tx.amountUsd);

      // Store in database
      const saved = await prisma.whaleTransaction.create({
        data: {
          txHash: tx.hash,
          blockchain: 'ethereum',
          symbol: 'ETH',
          amount: tx.amount,
          amountUsd: tx.amountUsd,
          fromAddress: tx.from,
          fromOwner: fromWallet?.ownerName,
          fromType: fromWallet?.ownerType,
          toAddress: tx.to,
          toOwner: toWallet?.ownerName,
          toType: toWallet?.ownerType,
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber,
          confirmations: tx.confirmations,
          transactionType,
          significance,
          source: 'blockchain-api',
        },
      });

      newTransactions.push(saved);
      console.log(`✓ Whale ETH transaction detected: ${(tx.amountUsd / 1000000).toFixed(1)}M USD - ${transactionType}`);
    }

  } catch (error) {
    console.error('Whale monitoring error:', error);
  }

  return newTransactions;
};

// Identify wallet owner from database
const identifyWallet = async (
  address: string,
  blockchain: string
): Promise<any | null> => {
  if (!address || address === 'Unknown') return null;

  const wallet = await prisma.whaleWallet.findFirst({
    where: { address, blockchain },
  });

  if (wallet) {
    // Update last seen
    await prisma.whaleWallet.update({
      where: { id: wallet.id },
      data: {
        lastSeen: new Date(),
        totalTxCount: { increment: 1 },
      },
    });
  }

  return wallet;
};

// Classify transaction type
const classifyTransaction = (
  fromWallet: any,
  toWallet: any
): string => {
  const fromIsExchange = fromWallet?.ownerType === 'exchange';
  const toIsExchange = toWallet?.ownerType === 'exchange';

  if (!fromIsExchange && toIsExchange) return 'exchange_inflow';
  if (fromIsExchange && !toIsExchange) return 'exchange_outflow';
  if (fromIsExchange && toIsExchange) return 'exchange_to_exchange';
  return 'whale_movement';
};

// Calculate significance level
const calculateSignificance = (amountUsd: number): string => {
  const { critical, high, medium } = WHALE_CONFIG.significanceThresholds;

  if (amountUsd >= critical) return 'critical';
  if (amountUsd >= high) return 'high';
  if (amountUsd >= medium) return 'medium';
  return 'low';
};

// Evaluate alerts (high and critical only)
export const evaluateWhaleAlerts = async (
  transactions: any[]
): Promise<any[]> => {
  return transactions.filter(tx =>
    tx.significance === 'high' || tx.significance === 'critical'
  ).map(tx => ({
    id: tx.id,
    txHash: tx.txHash,
    symbol: tx.symbol,
    blockchain: tx.blockchain,
    amount: tx.amount,
    amountUsd: tx.amountUsd,
    from: {
      address: tx.fromAddress,
      owner: tx.fromOwner || 'Unknown',
      type: tx.fromType || 'unknown',
    },
    to: {
      address: tx.toAddress,
      owner: tx.toOwner || 'Unknown',
      type: tx.toType || 'unknown',
    },
    transactionType: tx.transactionType,
    significance: tx.significance,
    interpretation: generateInterpretation(tx),
    timestamp: tx.timestamp.getTime(),
    explorerUrl: getExplorerUrl(tx.blockchain, tx.txHash),
  }));
};

// Generate human-readable interpretation
const generateInterpretation = (tx: any): string => {
  const amount = `$${(tx.amountUsd / 1000000).toFixed(1)}M`;

  if (tx.transactionType === 'exchange_inflow') {
    return `${amount} ${tx.symbol} moved TO ${tx.toOwner || 'exchange'} - potential sell pressure`;
  } else if (tx.transactionType === 'exchange_outflow') {
    return `${amount} ${tx.symbol} moved FROM ${tx.fromOwner || 'exchange'} - accumulation signal`;
  } else if (tx.transactionType === 'exchange_to_exchange') {
    return `${amount} ${tx.symbol} transferred between exchanges - arbitrage or liquidity management`;
  }
  return `${amount} ${tx.symbol} whale movement detected`;
};

// Get blockchain explorer URL
const getExplorerUrl = (blockchain: string, txHash: string): string => {
  const explorers: Record<string, string> = {
    bitcoin: `https://blockchain.com/btc/tx/${txHash}`,
    ethereum: `https://etherscan.io/tx/${txHash}`,
    'binance-smart-chain': `https://bscscan.com/tx/${txHash}`,
    solana: `https://solscan.io/tx/${txHash}`,
  };
  return explorers[blockchain] || '';
};

// Initialize monitoring (follows liquidationService pattern)
export const initializeWhaleMonitoring = async (io: Server): Promise<void> => {
  console.log('Whale monitoring initialized');

  setInterval(async () => {
    try {
      const transactions = await monitorWhaleTransactions();

      if (transactions.length > 0) {
        console.log(`Detected ${transactions.length} whale transactions`);

        const alerts = await evaluateWhaleAlerts(transactions);

        if (alerts.length > 0) {
          console.log(`Emitting ${alerts.length} whale alerts`);

          // Broadcast to all clients
          io.emit('whale-alert', {
            alerts,
            timestamp: Date.now(),
          });

          // Emit to symbol-specific rooms
          alerts.forEach(alert => {
            io.to(`whale:${alert.symbol}`).emit('whale-transaction', alert);
          });

          // Mark as alerted
          await prisma.whaleTransaction.updateMany({
            where: { id: { in: alerts.map(a => a.id) } },
            data: { alertSent: true },
          });
        }
      }
    } catch (error) {
      console.error('Whale monitoring loop error:', error);
    }
  }, WHALE_CONFIG.pollInterval);

  console.log(`Whale monitoring polling every ${WHALE_CONFIG.pollInterval / 1000}s`);
};
