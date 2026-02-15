import vader from 'vader-sentiment';

export interface SentimentResult {
  compound: number;    // -1 to +1
  positive: number;    // 0 to 1
  neutral: number;     // 0 to 1
  negative: number;    // 0 to 1
  inverse: number;     // Contrarian score
}

/**
 * Analyze sentiment of multiple texts using VADER
 * @param texts Array of strings to analyze
 * @returns Averaged sentiment scores with contrarian indicator
 */
export const analyzeSentiment = (texts: string[]): SentimentResult => {
  if (texts.length === 0) {
    return { compound: 0, positive: 0, neutral: 1, negative: 0, inverse: 0 };
  }

  // Analyze each text
  const scores = texts.map(text => {
    // Clean text (remove URLs, mentions, hashtags)
    const cleaned = cleanText(text);
    return vader.SentimentIntensityAnalyzer.polarity_scores(cleaned);
  });

  // Average scores
  const avg = {
    compound: scores.reduce((sum, s) => sum + s.compound, 0) / scores.length,
    positive: scores.reduce((sum, s) => sum + s.pos, 0) / scores.length,
    neutral: scores.reduce((sum, s) => sum + s.neu, 0) / scores.length,
    negative: scores.reduce((sum, s) => sum + s.neg, 0) / scores.length,
  };

  // Contrarian/inverse sentiment
  // When everyone is extremely bullish (>0.7), inverse becomes negative
  // When everyone is extremely bearish (<-0.7), inverse becomes positive
  const inverse = calculateInverseSentiment(avg.compound, scores.length);

  return { ...avg, inverse };
};

/**
 * Calculate contrarian sentiment indicator
 * Extreme sentiment + high volume = potential reversal signal
 */
const calculateInverseSentiment = (
  compound: number,
  volume: number
): number => {
  // Contrarian indicator: extreme sentiment + high volume = reversal signal
  const extremeness = Math.abs(compound);
  const volumeWeight = Math.min(volume / 100, 1); // Cap at 100 samples

  if (extremeness > 0.7 && volumeWeight > 0.5) {
    // Extreme + popular = contrarian signal
    return -compound * extremeness;
  }

  return 0; // Not extreme enough
};

/**
 * Clean text for sentiment analysis
 * Remove URLs, mentions, hashtags for better accuracy
 */
const cleanText = (text: string): string => {
  return text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/@\w+/g, '') // Remove mentions
    .replace(/#/g, '') // Remove hashtag symbol but keep word
    .trim();
};

/**
 * Get coin name from symbol for searches
 */
export const getCoinName = (symbol: string): string => {
  const coinNames: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    XMR: 'Monero',
    HYPE: 'Hyperliquid',
    BNB: 'BNB',
    ADA: 'Cardano',
    DOT: 'Polkadot',
    MATIC: 'Polygon',
    LINK: 'Chainlink',
    AVAX: 'Avalanche',
    UNI: 'Uniswap',
    ATOM: 'Cosmos',
    LTC: 'Litecoin',
    XRP: 'Ripple',
  };

  return coinNames[symbol.toUpperCase()] || symbol;
};
