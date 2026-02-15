import { useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import PageTransition from '../components/PageTransition'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import { CardSkeleton } from '../components/SkeletonLoader'

const API_URL = import.meta.eenv.VITE_API_URL || 'http://localhost:5000/api'

const Indicators = () => {
  const [indicators, setIndicators] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    exchange: 'BINANCE',
    symbol: 'BTC/USDT',
    timeframe: '1h',
  })

  const fetchIndicators = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/indicators`, {
        params: formData,
      })
      setIndicators(response.data.indicators)
    } catch (error) {
      console.error('Failed to fetch indicators:', error)
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-gradient">Technical Indicators</h1>
          <p className="mt-2 text-muted-foreground">View calculated technical indicators</p>
        </motion.div>

        {/* Calculate form */}
        <AnimatedCard delay={0.1} glass>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Calculate Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>
          </div>
          <AnimatedButton
            onClick={fetchIndicators}
            variant="primary"
            isLoading={loading}
          >
            Calculate Indicators
          </AnimatedButton>
        </AnimatedCard>

        {/* Indicators grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : indicators && (
          <AnimatedCard delay={0.2} glass>
            <h2 className="text-xl font-semibold text-card-foreground mb-4">Indicator Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(indicators).map(([key, value]: [string, any], idx) => {
                if (Array.isArray(value) && value.length > 0) {
                  const lastValue = value[value.length - 1]
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(147, 51, 234, 0.3)' }}
                      className="border border-white/10 rounded-lg p-4 bg-gradient-to-br from-card to-card/50 hover-glow cursor-pointer"
                    >
                      <h3 className="font-semibold text-gradient mb-2">{key.toUpperCase()}</h3>
                      {typeof lastValue === 'object' ? (
                        <pre className="text-xs text-muted-foreground overflow-auto">
                          {JSON.stringify(lastValue, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-2xl font-bold text-cyber-purple">{lastValue?.toFixed?.(4) || lastValue}</p>
                      )}
                    </motion.div>
                  )
                }
                return null
              })}
            </div>
          </AnimatedCard>
        )}
      </div>
    </PageTransition>
  )
}

export default Indicators
