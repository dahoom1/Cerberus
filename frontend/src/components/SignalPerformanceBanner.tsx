import { motion } from 'framer-motion';

interface SignalPerformanceBannerProps {
  signal: any;
}

const SignalPerformanceBanner = ({ signal }: SignalPerformanceBannerProps) => {
  if (!signal.performance) return null;

  const pnl = signal.performance.currentPnL || 0;
  const isProfit = pnl >= 0;

  const bgColor = isProfit
    ? 'bg-gradient-to-r from-cyber-green/20 to-cyber-green/5'
    : 'bg-gradient-to-r from-red-500/20 to-red-500/5';

  const textColor = isProfit ? 'text-cyber-green' : 'text-red-500';
  const borderColor = isProfit ? 'border-cyber-green/30' : 'border-red-500/30';

  const getAccuracyColor = (score: number) => {
    if (score >= 80) return 'text-cyber-green';
    if (score >= 60) return 'text-cyber-blue';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-500';
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'EXCELLENT':
        return 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30';
      case 'GOOD':
        return 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30';
      case 'AVERAGE':
        return 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30';
      case 'POOR':
        return 'bg-red-500/20 text-red-500 border border-red-500/30';
      default:
        return 'bg-muted-foreground/20 text-muted-foreground border border-muted-foreground/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} ${borderColor} border-t px-4 py-2 flex justify-between items-center`}
    >
      <div className="flex items-center gap-3">
        <div>
          <span className="text-xs text-muted-foreground">Live P&L:</span>
          <motion.span
            key={pnl}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`ml-2 text-sm font-bold ${textColor}`}
          >
            {isProfit ? '+' : ''}{pnl.toFixed(2)}%
          </motion.span>
        </div>
        {signal.performance.currentPrice && (
          <div>
            <span className="text-xs text-muted-foreground">Current:</span>
            <span className="ml-2 text-sm font-semibold text-foreground">
              ${signal.performance.currentPrice.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {signal.performance.accuracyScore !== null && signal.performance.accuracyScore !== undefined && (
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Accuracy:</span>
            <span className={`ml-2 text-sm font-bold ${getAccuracyColor(signal.performance.accuracyScore)}`}>
              {signal.performance.accuracyScore.toFixed(0)}%
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${getTierBadge(signal.performance.performanceTier)}`}>
            {signal.performance.performanceTier}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default SignalPerformanceBanner;
