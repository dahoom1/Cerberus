import {
  SMA,
  EMA,
  MACD,
  ADX,
  PSAR,
  RSI,
  Stochastic,
  CCI,
  WilliamsR,
  ROC,
  BollingerBands,
  ATR,
  OBV,
  MFI,
  VWAP,
} from 'technicalindicators';
import { Server } from 'socket.io';
import { fetchOHLCV } from './exchangeService';
import { prisma } from '../index';

export interface IndicatorResult {
  name: string;
  value: number | number[] | any;
  timestamp: number;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Convert CCXT OHLCV format to our format
const convertOHLCV = (ccxtData: number[][]): OHLCVData[] => {
  return ccxtData.map(([timestamp, open, high, low, close, volume]) => ({
    timestamp,
    open,
    high,
    low,
    close,
    volume,
  }));
};

// Extract arrays from OHLCV data
const extractArrays = (data: OHLCVData[]) => {
  return {
    open: data.map(d => d.open),
    high: data.map(d => d.high),
    low: data.map(d => d.low),
    close: data.map(d => d.close),
    volume: data.map(d => d.volume),
  };
};

// TREND INDICATORS

export const calculateSMA = (close: number[], period: number): number[] => {
  return SMA.calculate({ values: close, period });
};

export const calculateEMA = (close: number[], period: number): number[] => {
  return EMA.calculate({ values: close, period });
};

export const calculateMACD = (close: number[]): any[] => {
  return MACD.calculate({
    values: close,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
};

export const calculateADX = (high: number[], low: number[], close: number[], period: number = 14): any[] => {
  return ADX.calculate({
    high,
    low,
    close,
    period,
  }) as any[];
};

export const calculatePSAR = (high: number[], low: number[], step: number = 0.02, max: number = 0.2): number[] => {
  return PSAR.calculate({
    high,
    low,
    step,
    max,
  });
};

// Ichimoku Cloud
export const calculateIchimoku = (high: number[], low: number[], close: number[]) => {
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;

  const tenkan = high.slice(0, tenkanPeriod).concat(
    high.slice(tenkanPeriod).map((_, i) => {
      const periodHigh = Math.max(...high.slice(i, i + tenkanPeriod));
      const periodLow = Math.min(...low.slice(i, i + tenkanPeriod));
      return (periodHigh + periodLow) / 2;
    })
  );

  const kijun = high.slice(0, kijunPeriod).concat(
    high.slice(kijunPeriod).map((_, i) => {
      const periodHigh = Math.max(...high.slice(i, i + kijunPeriod));
      const periodLow = Math.min(...low.slice(i, i + kijunPeriod));
      return (periodHigh + periodLow) / 2;
    })
  );

  const senkouA = tenkan.map((t, i) => (t + kijun[i]) / 2);

  const senkouB = high.slice(0, senkouBPeriod).concat(
    high.slice(senkouBPeriod).map((_, i) => {
      const periodHigh = Math.max(...high.slice(i, i + senkouBPeriod));
      const periodLow = Math.min(...low.slice(i, i + senkouBPeriod));
      return (periodHigh + periodLow) / 2;
    })
  );

  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
  };
};

// MOMENTUM INDICATORS

export const calculateRSI = (close: number[], period: number = 14): number[] => {
  return RSI.calculate({ values: close, period });
};

export const calculateStochastic = (high: number[], low: number[], close: number[], period: number = 14): any[] => {
  return Stochastic.calculate({
    high,
    low,
    close,
    period,
    signalPeriod: 3,
  });
};

export const calculateCCI = (high: number[], low: number[], close: number[], period: number = 20): number[] => {
  return CCI.calculate({
    high,
    low,
    close,
    period,
  });
};

export const calculateWilliamsR = (high: number[], low: number[], close: number[], period: number = 14): number[] => {
  return WilliamsR.calculate({
    high,
    low,
    close,
    period,
  });
};

export const calculateROC = (close: number[], period: number = 12): number[] => {
  return ROC.calculate({ values: close, period });
};

export const calculateMomentum = (close: number[], period: number = 10): number[] => {
  try {
    // Manual momentum calculation (current price - price N periods ago)
    const momentum: number[] = [];
    for (let i = period; i < close.length; i++) {
      momentum.push(close[i] - close[i - period]);
    }
    return new Array(period).fill(0).concat(momentum);
  }
};

// VOLATILITY INDICATORS

export const calculateBollingerBands = (close: number[], period: number = 20, stdDev: number = 2): any[] => {
  return BollingerBands.calculate({
    values: close,
    period,
    stdDev,
  });
};

export const calculateATR = (high: number[], low: number[], close: number[], period: number = 14): number[] => {
  return ATR.calculate({
    high,
    low,
    close,
    period,
  });
};

// Keltner Channels
export const calculateKeltnerChannels = (
  high: number[],
  low: number[],
  close: number[],
  period: number = 20,
  multiplier: number = 2
): any[] => {
  const ema = calculateEMA(close, period);
  const atr = calculateATR(high, low, close, period);

  return ema.map((middle, i) => {
    const upper = middle + (atr[i] * multiplier);
    const lower = middle - (atr[i] * multiplier);
    return { upper, middle, lower };
  });
};

// Donchian Channels
export const calculateDonchianChannels = (
  high: number[],
  low: number[],
  period: number = 20
): any[] => {
  return high.map((_, i) => {
    if (i < period - 1) {
      return { upper: high[i], lower: low[i], middle: (high[i] + low[i]) / 2 };
    }
    const periodHigh = Math.max(...high.slice(i - period + 1, i + 1));
    const periodLow = Math.min(...low.slice(i - period + 1, i + 1));
    return {
      upper: periodHigh,
      lower: periodLow,
      middle: (periodHigh + periodLow) / 2,
    };
  });
};

// VOLUME INDICATORS

export const calculateOBV = (close: number[], volume: number[]): number[] => {
  return OBV.calculate({
    close,
    volume,
  });
};

export const calculateVWAP = (high: number[], low: number[], close: number[], volume: number[]): number[] => {
  return VWAP.calculate({
    high,
    low,
    close,
    volume,
  });
};

export const calculateMFI = (high: number[], low: number[], close: number[], volume: number[], period: number = 14): number[] => {
  return MFI.calculate({
    high,
    low,
    close,
    volume,
    period,
  });
};

// Volume Rate of Change
export const calculateVolumeROC = (volume: number[], period: number = 12): number[] => {
  return ROC.calculate({ values: volume, period });
};

// Accumulation/Distribution Line
export const calculateA_D = (high: number[], low: number[], close: number[], volume: number[]): number[] => {
  const ad: number[] = [];
  let adValue = 0;

  for (let i = 0; i < close.length; i++) {
    const clv = ((close[i] - low[i]) - (high[i] - close[i])) / (high[i] - low[i] || 1);
    adValue += clv * volume[i];
    ad.push(adValue);
  }

  return ad;
};

// Chaikin Money Flow
export const calculateCMF = (
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  period: number = 20
): number[] => {
  const cmf: number[] = [];
  const moneyFlowVolume: number[] = [];

  for (let i = 0; i < close.length; i++) {
    const mfv = ((close[i] - low[i]) - (high[i] - close[i])) / (high[i] - low[i] || 1) * volume[i];
    moneyFlowVolume.push(mfv);
  }

  for (let i = period - 1; i < moneyFlowVolume.length; i++) {
    const periodMFV = moneyFlowVolume.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const periodVolume = volume.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    cmf.push(periodVolume !== 0 ? periodMFV / periodVolume : 0);
  }

  // Pad with zeros for initial period
  return new Array(period - 1).fill(0).concat(cmf);
};

// SUPPORT/RESISTANCE

// Fibonacci Retracement
export const calculateFibonacciRetracement = (high: number, low: number): {
  level0: number;
  level236: number;
  level382: number;
  level5: number;
  level618: number;
  level786: number;
  level1: number;
} => {
  const diff = high - low;
  return {
    level0: high,
    level236: high - diff * 0.236,
    level382: high - diff * 0.382,
    level5: high - diff * 0.5,
    level618: high - diff * 0.618,
    level786: high - diff * 0.786,
    level1: low,
  };
};

// Pivot Points
export const calculatePivotPoints = (
  high: number,
  low: number,
  close: number,
  type: 'standard' | 'fibonacci' | 'camarilla' = 'standard'
): any => {
  const pivot = (high + low + close) / 3;
  const range = high - low;

  if (type === 'standard') {
    return {
      pivot,
      r1: 2 * pivot - low,
      r2: pivot + range,
      r3: high + 2 * (pivot - low),
      s1: 2 * pivot - high,
      s2: pivot - range,
      s3: low - 2 * (high - pivot),
    };
  } else if (type === 'fibonacci') {
    return {
      pivot,
      r1: pivot + 0.382 * range,
      r2: pivot + 0.618 * range,
      r3: pivot + 1.0 * range,
      s1: pivot - 0.382 * range,
      s2: pivot - 0.618 * range,
      s3: pivot - 1.0 * range,
    };
  } else {
    // Camarilla
    return {
      pivot,
      r1: close + range * 1.1 / 12,
      r2: close + range * 1.1 / 6,
      r3: close + range * 1.1 / 4,
      r4: close + range * 1.1 / 2,
      s1: close - range * 1.1 / 12,
      s2: close - range * 1.1 / 6,
      s3: close - range * 1.1 / 4,
      s4: close - range * 1.1 / 2,
    };
  }
};

// Calculate all indicators for a symbol
export const calculateAllIndicators = async (
  exchange: string,
  symbol: string,
  timeframe: string = '1h'
): Promise<Record<string, any>> => {
  try {
    const ohlcvData = await fetchOHLCV(exchange, symbol, timeframe, 500);
    if (!ohlcvData || ohlcvData.length < 200) {
      throw new Error('Insufficient data');
    }

    const data = convertOHLCV(ohlcvData);
    const { open, high, low, close, volume } = extractArrays(data);

    const indicators: Record<string, any> = {};

    // Trend Indicators
    indicators.sma20 = calculateSMA(close, 20);
    indicators.sma50 = calculateSMA(close, 50);
    indicators.sma100 = calculateSMA(close, 100);
    indicators.sma200 = calculateSMA(close, 200);
    indicators.ema9 = calculateEMA(close, 9);
    indicators.ema12 = calculateEMA(close, 12);
    indicators.ema20 = calculateEMA(close, 20);
    indicators.ema26 = calculateEMA(close, 26);
    indicators.ema50 = calculateEMA(close, 50);
    indicators.ema200 = calculateEMA(close, 200);
    indicators.macd = calculateMACD(close);
    indicators.adx = calculateADX(high, low, close);
    indicators.psar = calculatePSAR(high, low);
    indicators.ichimoku = calculateIchimoku(high, low, close);

    // Momentum Indicators
    indicators.rsi = calculateRSI(close);
    indicators.stochastic = calculateStochastic(high, low, close);
    indicators.cci = calculateCCI(high, low, close);
    indicators.williamsR = calculateWilliamsR(high, low, close);
    indicators.roc = calculateROC(close);
    indicators.momentum = calculateMomentum(close);

    // Volatility Indicators
    indicators.bollingerBands = calculateBollingerBands(close);
    indicators.atr = calculateATR(high, low, close);
    indicators.keltnerChannels = calculateKeltnerChannels(high, low, close);
    indicators.donchianChannels = calculateDonchianChannels(high, low);

    // Volume Indicators
    indicators.obv = calculateOBV(close, volume);
    indicators.vwap = calculateVWAP(high, low, close, volume);
    indicators.mfi = calculateMFI(high, low, close, volume);
    indicators.volumeROC = calculateVolumeROC(volume);
    indicators.accumulationDistribution = calculateA_D(high, low, close, volume);
    indicators.cmf = calculateCMF(high, low, close, volume);

    // Support/Resistance
    const latestHigh = Math.max(...high.slice(-20));
    const latestLow = Math.min(...low.slice(-20));
    indicators.fibonacci = calculateFibonacciRetracement(latestHigh, latestLow);
    
    const lastHigh = high[high.length - 1];
    const lastLow = low[low.length - 1];
    const lastClose = close[close.length - 1];
    indicators.pivotPoints = {
      standard: calculatePivotPoints(lastHigh, lastLow, lastClose, 'standard'),
      fibonacci: calculatePivotPoints(lastHigh, lastLow, lastClose, 'fibonacci'),
      camarilla: calculatePivotPoints(lastHigh, lastLow, lastClose, 'camarilla'),
    };

    return indicators;
  } catch (error) {
    console.error(`Error calculating indicators for ${exchange} ${symbol}:`, error);
    throw error;
  }
};

export const initializeIndicatorEngine = async (io: Server): Promise<void> => {
  console.log('Indicator engine initialized');
  // Background job to calculate indicators periodically
  // This would typically use Bull queue in production
};