import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import PageTransition from '../components/PageTransition'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface HeatmapData {
  price: number
  intensity: number
  liquidity: number
}

interface LiquidationZone {
  id: string
  symbol: string
  exchange: string
  price: number
  side: string
  estimatedLiquidity: number
  confidence: number
  detectedAt: string
  reasoning?: string[]
  suggestion?: 'BUY' | 'SELL' | 'NEUTRAL'
  stopLoss1?: number
  stopLoss2?: number
  takeProfit1?: number
  takeProfit2?: number
  heatmapData?: HeatmapData[]
}

// Heatmap visualization component
const HeatmapChart = ({ data, side }: { data: HeatmapData[]; side: string }) => {
  if (!data || data.length === 0) return null

  const maxIntensity = Math.max(...data.map(d => d.intensity))

  return (
    <div className="mt-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Liquidation Heatmap</p>
      <div className="space-y-1">
        {data.slice(0, 10).map((point, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">${point.price.toFixed(2)}</span>
            <div className="flex-1 h-2 bg-card/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(point.intensity / maxIntensity) * 100}%` }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
                className={`h-full ${
                  side === 'LONG'
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : 'bg-gradient-to-r from-cyber-green to-green-600'
                }`}
                style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {point.intensity.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const Liquidation = () => {
  const [zones, setZones] = useState<LiquidationZone[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedZone, setExpandedZone] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    exchange: 'BINANCE',
    symbol: 'BTC/USDT',
  })

  const fetchZones = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/liquidation/zones`, {
        params: formData,
      })
      setZones(response.data.zones || [])
    } catch (error) {
      console.error('Failed to fetch liquidation zones:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  const getSuggestionColor = (suggestion?: string) => {
    switch (suggestion) {
      case 'BUY':
        return 'text-cyber-green'
      case 'SELL':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  const getSuggestionBg = (suggestion?: string) => {
    switch (suggestion) {
      case 'BUY':
        return 'bg-cyber-green/10 border-cyber-green/30'
      case 'SELL':
        return 'bg-red-500/10 border-red-500/30'
      default:
        return 'bg-gray-500/10 border-gray-500/30'
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
          <h1 className="text-3xl font-bold text-gradient">Liquidation Zones</h1>
          <p className="mt-2 text-muted-foreground">Advanced liquidation analysis with trading recommendations</p>
        </motion.div>

        {/* Detect form */}
        <AnimatedCard delay={0.1} glass>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Detect Zones</h2>
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
            <div className="flex items-end">
              <AnimatedButton
                onClick={fetchZones}
                variant="primary"
                isLoading={loading}
                className="w-full"
              >
                Detect Zones
              </AnimatedButton>
            </div>
          </div>
        </AnimatedCard>

        {/* Detected zones */}
        <AnimatedCard delay={0.2} glass>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Detected Zones</h2>
          {zones.length === 0 ? (
            <p className="text-muted-foreground">No liquidation zones detected. Try detecting zones for a symbol.</p>
          ) : (
            <div className="space-y-4">
              {zones.map((zone, idx) => (
                <motion.div
                  key={zone.id || `${zone.exchange}-${zone.symbol}-${zone.price}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`border rounded-lg overflow-hidden ${
                    zone.side === 'LONG'
                      ? 'border-red-500/30 bg-gradient-to-r from-card to-red-500/10'
                      : 'border-cyber-green/30 bg-gradient-to-r from-card to-cyber-green/10'
                  }`}
                >
                  {/* Main zone info - clickable */}
                  <motion.div
                    onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                    className="p-4 cursor-pointer"
                    whileHover={{ x: 5, boxShadow: zone.side === 'LONG' ? '0 8px 25px rgba(239, 68, 68, 0.3)' : '0 8px 25px rgba(16, 185, 129, 0.3)' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground text-lg">
                            {zone.symbol} - {zone.exchange}
                          </h3>
                          {zone.suggestion && (
                            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getSuggestionBg(zone.suggestion)} ${getSuggestionColor(zone.suggestion)}`}>
                              {zone.suggestion}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className={`font-semibold ${zone.side === 'LONG' ? 'text-red-500' : 'text-cyber-green'}`}>
                            {zone.side} Liquidation
                          </span>
                          {' • '}Price: <span className="text-gradient font-semibold">${zone.price.toFixed(2)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Confidence: <span className="text-gradient font-semibold">{zone.confidence.toFixed(0)}%</span> •
                          Est. Liquidity: <span className="text-foreground font-semibold">${zone.estimatedLiquidity.toFixed(2)}</span>
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: expandedZone === zone.id ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-muted-foreground"
                      >
                        ▼
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedZone === zone.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4 space-y-4">
                          {/* Confidence Reasoning */}
                          {zone.reasoning && zone.reasoning.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gradient mb-2">Confidence Analysis:</h4>
                              <ul className="space-y-1">
                                {zone.reasoning.map((reason, rIdx) => (
                                  <motion.li
                                    key={rIdx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: rIdx * 0.1 }}
                                    className="text-sm text-muted-foreground flex items-start gap-2"
                                  >
                                    <span className="text-cyber-purple mt-0.5">•</span>
                                    <span>{reason}</span>
                                  </motion.li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Trading Levels */}
                          {zone.suggestion !== 'NEUTRAL' && (
                            <div className="grid grid-cols-2 gap-4">
                              {/* Stop Loss Levels */}
                              <div>
                                <h4 className="text-sm font-semibold text-red-400 mb-2">Stop Loss Levels:</h4>
                                <div className="space-y-2">
                                  {zone.stopLoss1 && (
                                    <div className="flex justify-between items-center p-2 bg-red-500/10 border border-red-500/30 rounded">
                                      <span className="text-xs text-muted-foreground">SL1 (Tight):</span>
                                      <span className="text-sm font-bold text-red-400">${zone.stopLoss1.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {zone.stopLoss2 && (
                                    <div className="flex justify-between items-center p-2 bg-red-500/5 border border-red-500/20 rounded">
                                      <span className="text-xs text-muted-foreground">SL2 (Wide):</span>
                                      <span className="text-sm font-bold text-red-400">${zone.stopLoss2.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Take Profit Levels */}
                              <div>
                                <h4 className="text-sm font-semibold text-cyber-green mb-2">Take Profit Levels:</h4>
                                <div className="space-y-2">
                                  {zone.takeProfit1 && (
                                    <div className="flex justify-between items-center p-2 bg-cyber-green/10 border border-cyber-green/30 rounded">
                                      <span className="text-xs text-muted-foreground">TP1 (Quick):</span>
                                      <span className="text-sm font-bold text-cyber-green">${zone.takeProfit1.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {zone.takeProfit2 && (
                                    <div className="flex justify-between items-center p-2 bg-cyber-green/5 border border-cyber-green/20 rounded">
                                      <span className="text-xs text-muted-foreground">TP2 (Extended):</span>
                                      <span className="text-sm font-bold text-cyber-green">${zone.takeProfit2.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Heatmap */}
                          {zone.heatmapData && zone.heatmapData.length > 0 && (
                            <HeatmapChart data={zone.heatmapData} side={zone.side} />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </div>
    </PageTransition>
  )
}

export default Liquidation
