import { Server } from 'socket.io';
import { prisma } from '../index';
import {
  fetchOrderBook,
  fetchOpenInterest,
  fetchFundingRate,
  fetchOHLCV,
  fetchTicker,
} from './exchangeService';

export interface LiquidationZone {
  price: number;
  side: 'LONG' | 'SHORT';
  estimatedLiquidity: number;
  confidence: number;
  exchange: string;
  symbol: string;
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

    // Build confidence score
    let confidence = 0;
    let estimatedLiquidity = 0;

    // Order book imbalance detection
    if (orderBookAnalysis) {
      if (orderBookAnalysis.longLiquidation > 0) {
        confidence += 30;
        estimatedLiquidity += orderBookAnalysis.longLiquidation * 0.1;
        zones.push({
          price: orderBookAnalysis.longLiquidation,
          side: 'LONG',
          estimatedLiquidity,
          confidence: Math.min(confidence, 100),
          exchange,
          symbol,
        });
      }
      if (orderBookAnalysis.shortLiquidation > 0) {
        confidence += 30;
        estimatedLiquidity += orderBookAnalysis.shortLiquidation * 0.1;
        zones.push({
          price: orderBookAnalysis.shortLiquidation,
          side: 'SHORT',
          estimatedLiquidity,
          confidence: Math.min(confidence, 100),
          exchange,
          symbol,
        });
      }
    }

    // Funding rate extreme detection
    if (fundingAnalysis.extreme) {
      confidence += 40;
      const estimatedPrice = fundingAnalysis.side === 'LONG'
        ? currentPrice * 0.95 // 5% below for long liquidation
        : currentPrice * 1.05; // 5% above for short liquidation

      zones.push({
        price: estimatedPrice,
        side: fundingAnalysis.side!,
        estimatedLiquidity: Math.abs(fundingAnalysis.rate) * 1000000, // Rough estimate
        confidence: Math.min(confidence, 100),
        exchange,
        symbol,
      });
    }

    // Open interest analysis
    if (oiAnalysis.increasing && oiAnalysis.trend === 'UP') {
      // High OI with increasing trend suggests potential liquidation event
      confidence += 20;
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
      current = {
        ...current,
        price: (current.price + next.price) / 2,
        estimatedLiquidity: current.estimatedLiquidity + next.estimatedLiquidity,
        confidence: Math.max(current.confidence, next.confidence),
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
