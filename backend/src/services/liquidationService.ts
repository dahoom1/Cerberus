import { Server } from 'socket.io';
import { prisma } from '../index';
import {
  fetchOrderBook,
  fetchOpenInterest,
  fetchFundingRate,
  fetchOHLCV,
  fetchTicker,
} from './exchangeService';

export interface HeatmapData {
  price: number;
  intensity: number; // 0-100 representing liquidation concentration
  liquidity: number;
}

export interface LiquidationZone {
  price: number;
  side: 'LONG' | 'SHORT';
  estimatedLiquidity: number;
  confidence: number;
  exchange: string;
  symbol: string;
  reasoning: string[]; // Explain confidence factors
  suggestion: 'BUY' | 'SELL' | 'NEUTRAL'; // Trading recommendation
  stopLoss1: number; // First stop loss level
  stopLoss2: number; // Second stop loss level
  takeProfit1: number; // First take profit target
  takeProfit2: number; // Second take profit target
  heatmapData: HeatmapData[]; // Liquidation price distribution
}

export interface LiquidationAlert {
  symbol: string;
  exchange: string;
  zone: LiquidationZone;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
}

// Calculate estimated liquidation price for a position
const calculateLiquidationPrice = (
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  leverage: number,
  maintenanceMargin: number = 0.005 // 0.5% default
): number => {
  if (side === 'LONG') {
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
  } else {
    return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
  }
};

// Generate heatmap data for liquidation zones
const generateHeatmapData = (
  zonePri: number,
  side: 'LONG' | 'SHORT',
  currentPrice: number,
  confidence: number
): HeatmapData[] => {
  const heatmap: HeatmapData[] = [];
  const range = currentPrice * 0.1; // 10% range around zone
  const steps = 20; // 20 price levels

  for (let i = 0; i < steps; i++) {
    const offset = (i / steps) * range - (range / 2);
    const price = zonePri + offset;

    // Calculate intensity - highest at zone price, decreasing with distance
    const distanceFromZone = Math.abs(price - zonePri) / zonePri;
    const intensity = Math.max(0, confidence * (1 - distanceFromZone * 10));

    // Estimate liquidity - higher near zone
    const liquidity = currentPrice * 0.01 * (1 - distanceFromZone * 5);

    heatmap.push({
      price: parseFloat(price.toFixed(2)),
      intensity: parseFloat(intensity.toFixed(2)),
      liquidity: Math.max(0, parseFloat(liquidity.toFixed(2))),
    });
  }

  return heatmap.sort((a, b) => a.price - b.price);
};

// Calculate trading suggestion based on liquidation zone
const calculateTradingSuggestion = (
  side: 'LONG' | 'SHORT',
  zonePrice: number,
  currentPrice: number,
  confidence: number,
  fundingRate: number
): 'BUY' | 'SELL' | 'NEUTRAL' => {
  // If confidence is low, stay neutral
  if (confidence < 40) return 'NEUTRAL';

  const distancePercent = Math.abs((zonePrice - currentPrice) / currentPrice) * 100;

  // LONG liquidation zone suggests price might drop there, then bounce
  if (side === 'LONG') {
    // If we're close to the zone and confidence is high, consider buying
    if (distancePercent < 2 && confidence > 60) {
      return 'BUY'; // Buy near liquidation for potential bounce
    }
    // If funding is extremely positive (many longs), consider shorting
    if (fundingRate > 0.002) {
      return 'SELL'; // Too many longs, might liquidate
    }
  }

  // SHORT liquidation zone suggests price might pump there, then drop
  if (side === 'SHORT') {
    // If we're close to the zone and confidence is high, consider selling
    if (distancePercent < 2 && confidence > 60) {
      return 'SELL'; // Sell near liquidation for potential reversal
    }
    // If funding is extremely negative (many shorts), consider buying
    if (fundingRate < -0.002) {
      return 'BUY'; // Too many shorts, might liquidate
    }
  }

  return 'NEUTRAL';
};

// Calculate stop loss and take profit levels
const calculateRiskLevels = (
  side: 'LONG' | 'SHORT',
  zonePrice: number,
  currentPrice: number,
  suggestion: 'BUY' | 'SELL' | 'NEUTRAL'
): { sl1: number; sl2: number; tp1: number; tp2: number } => {
  const atr = currentPrice * 0.02; // Simplified ATR estimate (2% of price)

  if (suggestion === 'BUY') {
    // For long positions
    return {
      sl1: zonePrice * 0.98, // 2% below zone (tight stop)
      sl2: zonePrice * 0.95, // 5% below zone (wider stop)
      tp1: zonePrice * 1.015, // 1.5% above zone (quick profit)
      tp2: zonePrice * 1.03, // 3% above zone (extended target)
    };
  } else if (suggestion === 'SELL') {
    // For short positions
    return {
      sl1: zonePrice * 1.02, // 2% above zone (tight stop)
      sl2: zonePrice * 1.05, // 5% above zone (wider stop)
      tp1: zonePrice * 0.985, // 1.5% below zone (quick profit)
      tp2: zonePrice * 0.97, // 3% below zone (extended target)
    };
  }

  // Neutral - still provide levels based on zone
  if (side === 'LONG') {
    return {
      sl1: zonePrice * 0.97,
      sl2: zonePrice * 0.94,
      tp1: zonePrice * 1.02,
      tp2: zonePrice * 1.04,
    };
  } else {
    return {
      sl1: zonePrice * 1.03,
      sl2: zonePrice * 1.06,
      tp1: zonePrice * 0.98,
      tp2: zonePrice * 0.96,
    };
  }
};

// Detect liquidation zones from order book imbalances
const detectOrderBookImbalance = async (
  exchange: string,
  symbol: string
): Promise<{ longLiquidation: number; shortLiquidation: number } | null> => {
  try {
    const orderBook = await fetchOrderBook(exchange, symbol, 100);
    if (!orderBook) return null;

    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];

    // Calculate total bid/ask volume
    const totalBidVolume = bids.reduce((sum, [price, volume]) => sum + volume, 0);
    const totalAskVolume = asks.reduce((sum, [price, volume]) => sum + volume, 0);

    // Calculate imbalance ratio
    const imbalanceRatio = totalBidVolume / (totalBidVolume + totalAskVolume);

    // If bids significantly outweigh asks, shorts are at risk (price might pump)
    // If asks significantly outweigh bids, longs are at risk (price might dump)
    const threshold = 0.6; // 60% threshold

    let longLiquidation = 0;
    let shortLiquidation = 0;

    if (imbalanceRatio < 0.4) {
      // Heavy ask pressure - longs at risk
      // Estimate liquidation zone below current price
      const currentPrice = (bids[0]?.[0] || 0);
      longLiquidation = currentPrice * 0.98; // 2% below
    } else if (imbalanceRatio > 0.6) {
      // Heavy bid pressure - shorts at risk
      // Estimate liquidation zone above current price
      const currentPrice = (asks[0]?.[0] || 0);
      shortLiquidation = currentPrice * 1.02; // 2% above
    }

    return { longLiquidation, shortLiquidation };
  } catch (error) {
    console.error('Error detecting order book imbalance:', error);
    return null;
  }
};

// Analyze funding rate extremes
const analyzeFundingRate = async (
  exchange: string,
  symbol: string
): Promise<{ extreme: boolean; side: 'LONG' | 'SHORT' | null; rate: number }> => {
  try {
    const fundingRate = await fetchFundingRate(exchange, symbol);
    if (fundingRate === null) {
      return { extreme: false, side: null, rate: 0 };
    }

    const threshold = 0.001; // 0.1% threshold

    if (fundingRate > threshold) {
      // Extremely positive funding rate - many longs, shorts pay longs
      // This suggests potential long liquidation hunt
      return { extreme: true, side: 'LONG', rate: fundingRate };
    } else if (fundingRate < -threshold) {
      // Extremely negative funding rate - many shorts, longs pay shorts
      // This suggests potential short liquidation hunt
      return { extreme: true, side: 'SHORT', rate: fundingRate };
    }

    return { extreme: false, side: null, rate: fundingRate };
  } catch (error) {
    console.error('Error analyzing funding rate:', error);
    return { extreme: false, side: null, rate: 0 };
  }
};

// Analyze open interest changes
const analyzeOpenInterest = async (
  exchange: string,
  symbol: string
): Promise<{ increasing: boolean; trend: 'UP' | 'DOWN' | 'STABLE' }> => {
  try {
    // In a real implementation, we'd track OI over time
    // For now, we'll use current OI as a proxy
    const openInterest = await fetchOpenInterest(exchange, symbol);
    
    // This is a simplified version - in production, track OI history
    return {
      increasing: openInterest !== null && openInterest > 0,
      trend: 'STABLE', // Would need historical data
    };
  } catch (error) {
    console.error('Error analyzing open interest:', error);
    return { increasing: false, trend: 'STABLE' };
  }
};

// Detect price approaching liquidation zones
const detectPriceApproach = async (
  exchange: string,
  symbol: string,
  liquidationPrice: number,
  side: 'LONG' | 'SHORT'
): Promise<{ approaching: boolean; distance: number }> => {
  try {
    const ticker = await fetchTicker(exchange, symbol);
    if (!ticker) {
      return { approaching: false, distance: Infinity };
    }

    const currentPrice = ticker.last || ticker.close || 0;
    const distance = side === 'LONG'
      ? ((currentPrice - liquidationPrice) / liquidationPrice) * 100
      : ((liquidationPrice - currentPrice) / currentPrice) * 100;

    // Consider approaching if within 5%
    const approaching = distance < 5 && distance > 0;

    return { approaching, distance };
  } catch (error) {
    console.error('Error detecting price approach:', error);
    return { approaching: false, distance: Infinity };
  }
};

// Main liquidation detection function
export const detectLiquidationZones = async (
  exchange: string,
  symbol: string
): Promise<LiquidationZone[]> => {
  const zones: LiquidationZone[] = [];

  try {
    // 1. Check order book imbalance
    const orderBookAnalysis = await detectOrderBookImbalance(exchange, symbol);
    
    // 2. Check funding rate
    const fundingAnalysis = await analyzeFundingRate(exchange, symbol);
    
    // 3. Check open interest
    const oiAnalysis = await analyzeOpenInterest(exchange, symbol);

    // 4. Get current price
    const ticker = await fetchTicker(exchange, symbol);
    if (!ticker) return zones;

    const currentPrice = ticker.last || ticker.close || 0;

    // Build zones with detailed analysis
    const zoneMap = new Map<string, {
      price: number;
      side: 'LONG' | 'SHORT';
      confidence: number;
      liquidity: number;
      reasoning: string[];
    }>();

    // Order book imbalance detection
    if (orderBookAnalysis) {
      if (orderBookAnalysis.longLiquidation > 0) {
        const key = `LONG_${orderBookAnalysis.longLiquidation.toFixed(2)}`;
        const existing = zoneMap.get(key) || { price: orderBookAnalysis.longLiquidation, side: 'LONG' as const, confidence: 0, liquidity: 0, reasoning: [] };
        existing.confidence += 30;
        existing.liquidity += orderBookAnalysis.longLiquidation * 0.1;
        existing.reasoning.push('Order book shows heavy ask pressure (30% confidence)');
        zoneMap.set(key, existing);
      }
      if (orderBookAnalysis.shortLiquidation > 0) {
        const key = `SHORT_${orderBookAnalysis.shortLiquidation.toFixed(2)}`;
        const existing = zoneMap.get(key) || { price: orderBookAnalysis.shortLiquidation, side: 'SHORT' as const, confidence: 0, liquidity: 0, reasoning: [] };
        existing.confidence += 30;
        existing.liquidity += orderBookAnalysis.shortLiquidation * 0.1;
        existing.reasoning.push('Order book shows heavy bid pressure (30% confidence)');
        zoneMap.set(key, existing);
      }
    }

    // Funding rate extreme detection
    if (fundingAnalysis.extreme) {
      const estimatedPrice = fundingAnalysis.side === 'LONG'
        ? currentPrice * 0.95 // 5% below for long liquidation
        : currentPrice * 1.05; // 5% above for short liquidation

      const key = `${fundingAnalysis.side}_${estimatedPrice.toFixed(2)}`;
      const existing = zoneMap.get(key) || { price: estimatedPrice, side: fundingAnalysis.side!, confidence: 0, liquidity: 0, reasoning: [] };
      existing.confidence += 40;
      existing.liquidity += Math.abs(fundingAnalysis.rate) * 1000000;
      existing.reasoning.push(`Extreme ${fundingAnalysis.side === 'LONG' ? 'positive' : 'negative'} funding rate ${(fundingAnalysis.rate * 100).toFixed(3)}% (40% confidence)`);
      zoneMap.set(key, existing);
    }

    // Open interest analysis
    if (oiAnalysis.increasing && oiAnalysis.trend === 'UP') {
      // Add to all existing zones
      for (const [key, zone] of zoneMap.entries()) {
        zone.confidence += 20;
        zone.reasoning.push('Open interest increasing with upward trend (20% confidence)');
      }
    }

    // Convert map to zones array with full details
    for (const [key, zoneData] of zoneMap.entries()) {
      const finalConfidence = Math.min(zoneData.confidence, 100);

      // Calculate trading suggestion
      const suggestion = calculateTradingSuggestion(
        zoneData.side,
        zoneData.price,
        currentPrice,
        finalConfidence,
        fundingAnalysis.rate
      );

      // Calculate risk levels
      const riskLevels = calculateRiskLevels(
        zoneData.side,
        zoneData.price,
        currentPrice,
        suggestion
      );

      // Generate heatmap
      const heatmapData = generateHeatmapData(
        zoneData.price,
        zoneData.side,
        currentPrice,
        finalConfidence
      );

      zones.push({
        price: zoneData.price,
        side: zoneData.side,
        estimatedLiquidity: zoneData.liquidity,
        confidence: finalConfidence,
        exchange,
        symbol,
        reasoning: zoneData.reasoning,
        suggestion,
        stopLoss1: riskLevels.sl1,
        stopLoss2: riskLevels.sl2,
        takeProfit1: riskLevels.tp1,
        takeProfit2: riskLevels.tp2,
        heatmapData,
      });
    }

    // Remove duplicates and merge similar zones
    const mergedZones = mergeSimilarZones(zones);

    return mergedZones;
  } catch (error) {
    console.error(`Error detecting liquidation zones for ${exchange} ${symbol}:`, error);
    return zones;
  }
};

// Merge similar liquidation zones
const mergeSimilarZones = (zones: LiquidationZone[]): LiquidationZone[] => {
  if (zones.length === 0) return zones;

  const merged: LiquidationZone[] = [];
  const sorted = zones.sort((a, b) => a.price - b.price);

  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const priceDiff = Math.abs((next.price - current.price) / current.price) * 100;

    // If zones are within 2% and same side, merge them
    if (priceDiff < 2 && next.side === current.side) {
      const avgPrice = (current.price + next.price) / 2;
      current = {
        ...current,
        price: avgPrice,
        estimatedLiquidity: current.estimatedLiquidity + next.estimatedLiquidity,
        confidence: Math.max(current.confidence, next.confidence),
        reasoning: [...new Set([...current.reasoning, ...next.reasoning])], // Merge unique reasoning
        stopLoss1: (current.stopLoss1 + next.stopLoss1) / 2,
        stopLoss2: (current.stopLoss2 + next.stopLoss2) / 2,
        takeProfit1: (current.takeProfit1 + next.takeProfit1) / 2,
        takeProfit2: (current.takeProfit2 + next.takeProfit2) / 2,
        heatmapData: current.heatmapData, // Keep first zone's heatmap
      };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
};

// Monitor and alert on liquidation zones
export const monitorLiquidationZones = async (
  exchange: string,
  symbol: string
): Promise<LiquidationAlert[]> => {
  const alerts: LiquidationAlert[] = [];
  
  try {
    const zones = await detectLiquidationZones(exchange, symbol);
    const ticker = await fetchTicker(exchange, symbol);
    
    if (!ticker) return alerts;

    const currentPrice = ticker.last || ticker.close || 0;

    for (const zone of zones) {
      const distance = zone.side === 'LONG'
        ? ((currentPrice - zone.price) / zone.price) * 100
        : ((zone.price - currentPrice) / currentPrice) * 100;

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (distance < 1) riskLevel = 'CRITICAL';
      else if (distance < 2) riskLevel = 'HIGH';
      else if (distance < 3) riskLevel = 'MEDIUM';

      // Only alert if within 5% and confidence > 50%
      if (distance < 5 && distance > 0 && zone.confidence > 50) {
        alerts.push({
          symbol,
          exchange,
          zone,
          riskLevel,
          message: `Potential ${zone.side} liquidation zone detected at $${zone.price.toFixed(2)} (${distance.toFixed(2)}% away). Confidence: ${zone.confidence.toFixed(0)}%`,
          timestamp: Date.now(),
        });

        // Save to database
        await prisma.liquidationZone.create({
          data: {
            symbol,
            exchange: exchange as any,
            price: zone.price,
            side: zone.side,
            estimatedLiquidity: zone.estimatedLiquidity,
            confidence: zone.confidence,
            reasoning: zone.reasoning,
            suggestion: zone.suggestion,
            stopLoss1: zone.stopLoss1,
            stopLoss2: zone.stopLoss2,
            takeProfit1: zone.takeProfit1,
            takeProfit2: zone.takeProfit2,
            heatmapData: zone.heatmapData,
          },
        });
      }
    }
  } catch (error) {
    console.error(`Error monitoring liquidation zones for ${exchange} ${symbol}:`, error);
  }

  return alerts;
};

// Initialize liquidation detector
export const initializeLiquidationDetector = async (io: Server): Promise<void> => {
  console.log('Liquidation detector initialized');

  // Monitor popular symbols
  const popularSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
  const exchanges = ['BINANCE', 'BYBIT', 'OKX'];

  setInterval(async () => {
    for (const exchange of exchanges) {
      for (const symbol of popularSymbols) {
        try {
          const alerts = await monitorLiquidationZones(exchange, symbol);
          
          if (alerts.length > 0) {
            // Emit alerts via WebSocket
            io.emit('liquidation-alert', {
              exchange,
              symbol,
              alerts,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          // Silently continue on errors
        }
      }
    }
  }, 30000); // Check every 30 seconds
};
