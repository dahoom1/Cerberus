import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, AlertCircle, Newspaper, Twitter } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface SignalDetailModalProps {
  signal: any;
  isOpen: boolean;
  onClose: () => void;
}

interface SentimentData {
  twitter: {
    sentiment: number;
    inverse: number;
    volume: number;
    timestamp: string;
  } | null;
  news: Array<{
    title: string;
    url: string;
    source: string;
    sentiment: number;
    score: number;
    publishedAt: string;
  }>;
}

const SignalDetailModal = ({ signal, isOpen, onClose }: SignalDetailModalProps) => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && signal) {
      fetchSentimentData();
    }
  }, [isOpen, signal]);

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      const baseSymbol = signal.symbol.split('/')[0]; // Extract BTC from BTC/USDT
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sentiment/${baseSymbol}`);
      setSentimentData(response.data);
    } catch (error) {
      console.error('Failed to fetch sentiment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!signal) return null;

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-cyber-green';
    if (sentiment < -0.3) return 'text-red-500';
    return 'text-yellow-400';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.6) return 'Very Bullish';
    if (sentiment > 0.3) return 'Bullish';
    if (sentiment > -0.3) return 'Neutral';
    if (sentiment > -0.6) return 'Bearish';
    return 'Very Bearish';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-card to-card/90 border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl">
              {/* Header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-white/10 p-6 flex justify-between items-start z-10">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {signal.symbol}
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      signal.signalType === 'BUY'
                        ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30'
                        : 'bg-red-500/20 text-red-500 border border-red-500/30'
                    }`}>
                      {signal.signalType}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {signal.exchange} • {new Date(signal.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Price & Confidence */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-cyber-purple/20 to-transparent border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Entry Price</p>
                    <p className="text-2xl font-bold text-gradient">${signal.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyber-green/20 to-transparent border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold text-cyber-green">{signal.confidence.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Performance Banner */}
                {signal.performance && (
                  <div className={`rounded-lg p-4 border ${
                    (signal.performance.currentPnL || 0) >= 0
                      ? 'bg-gradient-to-r from-cyber-green/20 to-cyber-green/5 border-cyber-green/30'
                      : 'bg-gradient-to-r from-red-500/20 to-red-500/5 border-red-500/30'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Live P&L</p>
                        <p className={`text-2xl font-bold ${
                          (signal.performance.currentPnL || 0) >= 0 ? 'text-cyber-green' : 'text-red-500'
                        }`}>
                          {(signal.performance.currentPnL || 0) >= 0 ? '+' : ''}
                          {(signal.performance.currentPnL || 0).toFixed(2)}%
                        </p>
                      </div>
                      {signal.performance.accuracyScore !== null && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Accuracy Score</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-xl font-bold ${
                              signal.performance.accuracyScore >= 80 ? 'text-cyber-green' :
                              signal.performance.accuracyScore >= 60 ? 'text-cyber-blue' :
                              signal.performance.accuracyScore >= 40 ? 'text-yellow-400' :
                              'text-red-500'
                            }`}>
                              {signal.performance.accuracyScore.toFixed(0)}%
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              signal.performance.performanceTier === 'EXCELLENT' ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' :
                              signal.performance.performanceTier === 'GOOD' ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30' :
                              signal.performance.performanceTier === 'AVERAGE' ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' :
                              'bg-red-500/20 text-red-500 border border-red-500/30'
                            }`}>
                              {signal.performance.performanceTier}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Reason */}
                {signal.reason && (
                  <div className="border border-white/10 rounded-lg p-4 bg-card/50">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Signal Reason
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {signal.reason}
                    </p>
                  </div>
                )}

                {/* Sentiment Analysis */}
                {(signal.sentimentScore !== null || sentimentData?.twitter) && (
                  <div className="border border-white/10 rounded-lg p-4 bg-card/50">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Twitter className="w-4 h-4" />
                      Social Sentiment
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Regular Sentiment</p>
                        <p className={`text-lg font-bold ${getSentimentColor(signal.sentimentScore || sentimentData?.twitter?.sentiment || 0)}`}>
                          {getSentimentLabel(signal.sentimentScore || sentimentData?.twitter?.sentiment || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((signal.sentimentScore || sentimentData?.twitter?.sentiment || 0) * 100).toFixed(0)}%
                        </p>
                      </div>
                      {signal.inverseSentiment !== null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Contrarian Signal</p>
                          <p className={`text-lg font-bold ${getSentimentColor(signal.inverseSentiment)}`}>
                            {((signal.inverseSentiment || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                      {sentimentData?.twitter && (
                        <div>
                          <p className="text-xs text-muted-foreground">Sample Size</p>
                          <p className="text-lg font-bold text-cyber-blue">{sentimentData.twitter.volume}</p>
                          <p className="text-xs text-muted-foreground">tweets</p>
                        </div>
                      )}
                    </div>
                    {signal.sentimentWeight && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Sentiment contributed +{signal.sentimentWeight.toFixed(1)}% to confidence
                      </p>
                    )}
                  </div>
                )}

                {/* News Articles */}
                {(signal.newsScore !== null || (sentimentData?.news && sentimentData.news.length > 0)) && (
                  <div className="border border-white/10 rounded-lg p-4 bg-card/50">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Newspaper className="w-4 h-4" />
                      Recent News
                    </h3>
                    {signal.newsWeight && (
                      <p className="text-xs text-muted-foreground mb-3">
                        News contributed +{signal.newsWeight.toFixed(1)}% to confidence
                      </p>
                    )}
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading news...</p>
                    ) : sentimentData?.news && sentimentData.news.length > 0 ? (
                      <div className="space-y-3">
                        {sentimentData.news.map((article, idx) => (
                          <a
                            key={idx}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-card/30 hover:bg-card/50 border border-white/5 rounded-lg transition-colors"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground hover:text-cyber-purple transition-colors">
                                  {article.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  article.sentiment > 0.3 ? 'bg-cyber-green/20 text-cyber-green' :
                                  article.sentiment < -0.3 ? 'bg-red-500/20 text-red-500' :
                                  'bg-yellow-400/20 text-yellow-400'
                                }`}>
                                  {(article.sentiment * 100).toFixed(0)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Score: {article.score.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent news available</p>
                    )}
                  </div>
                )}

                {/* Technical Indicators */}
                {signal.indicators && (
                  <div className="border border-white/10 rounded-lg p-4 bg-card/50">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Technical Indicators</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {Object.entries(signal.indicators as Record<string, any>).map(([key, value]) => (
                        <div key={key} className="bg-card/30 p-2 rounded">
                          <p className="text-muted-foreground">{key}</p>
                          <p className="font-semibold text-foreground">
                            {typeof value === 'number' ? value.toFixed(2) : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SignalDetailModal;
