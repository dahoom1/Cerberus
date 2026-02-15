import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { AppDispatch, RootState } from '../store/store'
import { fetchSignals, generateSignal } from '../store/slices/signalSlice'
import PageTransition from '../components/PageTransition'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import { SignalSkeleton } from '../components/SkeletonLoader'
import SignalDetailModal from '../components/SignalDetailModal'
import SignalPerformanceBanner from '../components/SignalPerformanceBanner'

const Signals = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { signals, loading } = useSelector((state: RootState) => state.signals)
  const [generating, setGenerating] = useState(false)
  const [selectedSignal, setSelectedSignal] = useState<any>(null)
  const [formData, setFormData] = useState({
    exchange: 'BINANCE',
    symbol: 'BTC/USDT',
    timeframe: '1h',
  })

  useEffect(() => {
    dispatch(fetchSignals())
  }, [dispatch])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      await dispatch(generateSignal(formData)).unwrap()
      dispatch(fetchSignals())
    } catch (error) {
      console.error('Failed to generate signal:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Animated header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gradient">Trading Signals</h1>
          <p className="mt-2 text-muted-foreground">Generate and view trading signals</p>
        </motion.div>

        {/* Generate signal form */}
        <AnimatedCard delay={0.1} glass>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Generate Signal</h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Exchange</label>
                <select
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                >
                  <option value="BINANCE">Binance</option>
                  <option value="BYBIT">Bybit</option>
                  <option value="OKX">OKX</option>
                  <option value="KRAKEN">Kraken</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="BTC/USDT"
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Timeframe</label>
                <select
                  value={formData.timeframe}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
              </div>
            </div>
            <AnimatedButton
              type="submit"
              variant="primary"
              isLoading={generating}
            >
              Generate Signal
            </AnimatedButton>
          </form>
        </AnimatedCard>

        {/* All signals section */}
        <AnimatedCard delay={0.2} glass>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">All Signals</h2>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <SignalSkeleton key={i} />)}
            </div>
          ) : signals.length === 0 ? (
            <p className="text-muted-foreground">No signals yet. Generate your first signal!</p>
          ) : (
            <div className="space-y-4">
              {signals.map((signal, idx) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ x: 5, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.2)' }}
                  onClick={() => setSelectedSignal(signal)}
                  className={`border rounded-lg overflow-hidden cursor-pointer ${
                    signal.signalType === 'BUY'
                      ? 'border-cyber-green/30 bg-gradient-to-r from-card to-cyber-green/5 hover-glow'
                      : signal.signalType === 'SELL'
                      ? 'border-red-500/30 bg-gradient-to-r from-card to-red-500/5 hover-glow'
                      : 'border-white/10 bg-gradient-to-r from-card to-card/50 hover-glow'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {signal.symbol} - {signal.exchange}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          <span className={`font-semibold ${
                            signal.signalType === 'BUY' ? 'text-cyber-green' :
                            signal.signalType === 'SELL' ? 'text-red-500' :
                            'text-gray-400'
                          }`}>
                            {signal.signalType}
                          </span>
                          {' • '}Confidence: <span className="text-gradient font-semibold">{signal.confidence.toFixed(0)}%</span>
                        </p>
                        {signal.reason && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {signal.reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-foreground">${signal.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Banner */}
                  <SignalPerformanceBanner signal={signal} />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Signal Detail Modal */}
      <SignalDetailModal
        signal={selectedSignal}
        isOpen={!!selectedSignal}
        onClose={() => setSelectedSignal(null)}
      />
    </PageTransition>
  )
}

export default Signals
