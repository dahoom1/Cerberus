import { prisma } from '../index';
import { fetchTicker } from './exchangeService';

/**
 * Update real-time performance for a single signal
 * Calculates current P&L based on latest price
 */
export const updateSignalPerformance = async (signalId: string): Promise<any> => {
  try {
    const signal = await prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { performance: true },
    });

    if (!signal) return null;

    // Fetch current price from exchange
    const ticker = await fetchTicker(signal.exchange, signal.symbol);
    if (!ticker) return null;

    const currentPrice = ticker.last || ticker.close || 0;
    if (currentPrice === 0) return null;

    const entryPrice = signal.price;

    // Calculate P&L percentage
    const rawPnL = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Adjust for signal type
    // SHORT/SELL means profit when price falls
    const adjustedPnL =
      signal.signalType === 'SELL' || signal.signalType === 'SHORT' ? -rawPnL : rawPnL;

    // Update or create performance record
    if (signal.performance) {
      const updated = await prisma.signalPerformance.update({
        where: { id: signal.performance.id },
        data: {
          currentPrice,
          currentPnL: adjustedPnL,
          highestPrice: Math.max(signal.performance.highestPrice || 0, currentPrice),
          lowestPrice: Math.min(
            signal.performance.lowestPrice || Infinity,
            currentPrice
          ),
          lastUpdated: new Date(),
        },
      });

      return updated;
    } else {
      const created = await prisma.signalPerformance.create({
        data: {
          signalId: signal.id,
          currentPrice,
          currentPnL: adjustedPnL,
          highestPrice: currentPrice,
          lowestPrice: currentPrice,
        },
      });

      return created;
    }
  } catch (error) {
    console.error(`Failed to update performance for signal ${signalId}:`, error);
    return null;
  }
};

/**
 * Calculate 1-week accuracy score for signals older than 7 days
 * Accuracy formula:
 * - Direction correct: 50 points
 * - Magnitude match: up to 30 points (stronger move = more points)
 * - Confidence match: up to 20 points (actual close to predicted)
 */
export const calculateWeeklyAccuracy = async (signalId: string): Promise<void> => {
  try {
    const signal = await prisma.tradingSignal.findUnique({
      where: { id: signalId },
      include: { performance: true },
    });

    if (!signal || !signal.performance) return;

    // Check if 7 days have passed
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (signal.timestamp > weekAgo) return; // Not old enough yet

    // Already calculated
    if (signal.performance.accuracyScore !== null) return;

    // Fetch final price (current price after 1 week)
    const ticker = await fetchTicker(signal.exchange, signal.symbol);
    if (!ticker) return;

    const weekEndPrice = ticker.last || ticker.close || 0;
    if (weekEndPrice === 0) return;

    const entryPrice = signal.price;
    const priceChange = ((weekEndPrice - entryPrice) / entryPrice) * 100;

    // Determine if direction was correct
    const predictedUp = signal.signalType === 'BUY' || signal.signalType === 'LONG';
    const actualUp = priceChange > 0;
    const directionCorrect = predictedUp === actualUp;

    // Calculate accuracy score (0-100)
    let accuracyScore = 0;

    // 1. Direction correctness: 50 points
    if (directionCorrect) {
      accuracyScore += 50;

      // 2. Magnitude bonus: up to 30 points
      // Stronger price move = higher score
      const magnitude = Math.abs(priceChange);
      accuracyScore += Math.min(magnitude * 3, 30); // 10% move = 30 points
    }

    // 3. Confidence match: up to 20 points
    // How close actual move matched predicted confidence
    const confidenceDiff = Math.abs(signal.confidence - Math.abs(priceChange));
    accuracyScore += Math.max(0, 20 - confidenceDiff);

    // Cap at 100
    accuracyScore = Math.min(accuracyScore, 100);

    // Determine performance tier
    let performanceTier = 'POOR';
    if (accuracyScore >= 80) performanceTier = 'EXCELLENT';
    else if (accuracyScore >= 60) performanceTier = 'GOOD';
    else if (accuracyScore >= 40) performanceTier = 'AVERAGE';

    // Update performance record
    await prisma.signalPerformance.update({
      where: { id: signal.performance.id },
      data: {
        weekEndPrice,
        directionCorrect,
        priceChange,
        accuracyScore,
        performanceTier,
        trackingEnded: new Date(),
      },
    });

    console.log(
      `✓ Calculated accuracy for signal ${signalId.slice(0, 8)}: ` +
      `${accuracyScore.toFixed(0)}% (${performanceTier})`
    );
  } catch (error) {
    console.error(`Failed to calculate accuracy for signal ${signalId}:`, error);
  }
};

/**
 * Monitor all active signals (last 30 days)
 * Updates real-time P&L and calculates weekly accuracy
 * Runs every 5 minutes as background job
 */
export const monitorAllSignals = async (): Promise<void> => {
  try {
    console.log('[Signal Tracker] Monitoring signal performance...');

    // Get signals from last 30 days
    const recentSignals = await prisma.tradingSignal.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      take: 100, // Limit to avoid overload
      orderBy: {
        timestamp: 'desc',
      },
    });

    let updated = 0;
    let calculated = 0;

    for (const signal of recentSignals) {
      // Update real-time performance
      const performance = await updateSignalPerformance(signal.id);
      if (performance) updated++;

      // Calculate weekly accuracy if applicable
      await calculateWeeklyAccuracy(signal.id);
      calculated++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(
      `[Signal Tracker] Updated ${updated}/${recentSignals.length} signals, ` +
      `calculated ${calculated} accuracy scores`
    );
  } catch (error) {
    console.error('[Signal Tracker] Failed:', error);
  }
};

/**
 * Get overall performance statistics for a user
 */
export const getUserPerformanceStats = async (userId: string) => {
  try {
    // Count signals by performance tier
    const stats = await prisma.signalPerformance.groupBy({
      by: ['performanceTier'],
      where: {
        signal: {
          userId,
        },
        performanceTier: {
          not: null,
        },
      },
      _count: true,
      _avg: {
        accuracyScore: true,
      },
    });

    // Total signals
    const total = await prisma.tradingSignal.count({
      where: { userId },
    });

    // Average P&L
    const avgPnL = await prisma.signalPerformance.aggregate({
      where: {
        signal: {
          userId,
        },
        currentPnL: {
          not: null,
        },
      },
      _avg: {
        currentPnL: true,
      },
    });

    return {
      totalSignals: total,
      averagePnL: avgPnL._avg.currentPnL || 0,
      byTier: stats.map(s => ({
        tier: s.performanceTier,
        count: s._count,
        avgAccuracy: s._avg.accuracyScore,
      })),
    };
  } catch (error) {
    console.error(`Failed to get performance stats for user ${userId}:`, error);
    return null;
  }
};
