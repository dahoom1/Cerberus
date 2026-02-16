import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import PageTransition from '../components/PageTransition'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5001'

interface WhaleTransaction {
  id: string
  txHash: string
  symbol: string
  blockchain: string
  amount: number
  amountUsd: number
  fromAddress: string
  fromOwner: string | null
  fromType: string | null
  toAddress: string
  toOwner: string | null
  toType: string | null
  timestamp: string
  transactionType: string
  significance: string
}

interface WhaleAlert {
  id: string
  txHash: string
  symbol: string
  blockchain: string
  amount: number
  amountUsd: number
  from: {
    address: string
    owner: string
    type: string
  }
  to: {
    address: string
    owner: string
    type: string
  }
  transactionType: string
  significance: string
  interpretation: string
  timestamp: number
  explorerUrl: string
}

interface WhaleSummary {
  symbol: string
  timeframe: string
  exchangeInflow: number
  exchangeOutflow: number
  netFlow: number
  inflowTxCount: number
  outflowTxCount: number
}

interface WhalePattern {
  pattern: 'accumulation' | 'distribution' | 'neutral'
  confidence: number
  netFlow: number
  reasoning: string[]
}

const WhaleMonitoring = () => {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([])
  const [summary, setSummary] = useState<WhaleSummary | null>(null)
  const [pattern, setPattern] = useState<WhalePattern | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('BTC')
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h')
  const [socket, setSocket] = useState<Socket | null>(null)

  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(WS_URL)

    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSocket')
      // Subscribe to whale alerts for selected symbol
      newSocket.emit('subscribe-whale', { symbol: selectedSymbol })
    })

    newSocket.on('whale-alert', (data: { alerts: WhaleAlert[]; timestamp: number }) => {
      console.log('🐋 Whale alert received:', data)

      data.alerts.forEach(alert => {
        // Show toast notification
        toast.custom((t) => (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-gradient-to-r from-cyber-blue/90 to-purple-600/90 backdrop-blur-lg border border-cyber-blue/30 rounded-lg p-4 shadow-2xl max-w-md"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">🐋</span>
              <div className="flex-1">
                <p className="font-bold text-white text-sm mb-1">
                  {alert.significance === 'critical' ? '🚨 CRITICAL' : '⚠️ HIGH'} Whale Alert
                </p>
                <p className="text-white/90 text-xs mb-2">{alert.interpretation}</p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-white/20 px-2 py-1 rounded">
                    ${(alert.amountUsd / 1000000).toFixed(1)}M
                  </span>
                  <span className="bg-white/20 px-2 py-1 rounded">
                    {alert.symbol}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ), { duration: 8000 })
      })

      // Refresh data
      fetchTransactions()
      fetchSummary()
      fetchPattern()
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [selectedSymbol])

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/whale/transactions`, {
        params: { symbol: selectedSymbol, limit: 20 },
      })
      setTransactions(response.data.transactions || [])
    } catch (error) {
      console.error('Failed to fetch whale transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/whale/summary`, {
        params: { symbol: selectedSymbol, timeframe },
      })
      setSummary(response.data.summary)
    } catch (error) {
      console.error('Failed to fetch whale summary:', error)
    }
  }

  // Fetch pattern analysis
  const fetchPattern = async () => {
    try {
      const response = await axios.get(`${API_URL}/whale/analysis/${selectedSymbol}`, {
        params: { hours: timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168 },
      })
      setPattern(response.data.analysis)
    } catch (error) {
      console.error('Failed to fetch whale pattern:', error)
    }
  }

  useEffect(() => {
    fetchTransactions()
    fetchSummary()
    fetchPattern()
  }, [selectedSymbol, timeframe])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exchange_inflow':
        return 'text-red-400'
      case 'exchange_outflow':
        return 'text-cyber-green'
      case 'exchange_to_exchange':
        return 'text-yellow-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getSignificanceColor = (sig: string) => {
    switch (sig) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'accumulation':
        return 'text-cyber-green'
      case 'distribution':
        return 'text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const truncateAddress = (address: string) => {
    if (!address || address === 'Unknown') return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyber-green via-cyber-blue to-purple-500 bg-clip-text text-transparent">
            🐋 Whale Monitoring
          </h1>
          <p className="text-muted-foreground text-lg">
            Track large crypto transfers in real-time • $5M+ USD threshold
          </p>
        </motion.div>

        {/* Symbol Selection */}
        <AnimatedCard delay={0.1}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Asset</h3>
            <div className="flex flex-wrap gap-3">
              {symbols.map((symbol) => (
                <AnimatedButton
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedSymbol === symbol
                      ? 'bg-gradient-to-r from-cyber-green to-green-600 text-black'
                      : 'bg-card hover:bg-card/80 text-foreground'
                  }`}
                >
                  {symbol}
                </AnimatedButton>
              ))}
            </div>
          </div>
        </AnimatedCard>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pattern Analysis */}
          <AnimatedCard delay={0.2}>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Whale Pattern</h3>
              {pattern ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-3xl font-bold ${getPatternColor(pattern.pattern)}`}>
                      {pattern.pattern === 'accumulation' ? '📈' : pattern.pattern === 'distribution' ? '📉' : '➡️'}
                    </span>
                    <div>
                      <p className={`text-xl font-bold capitalize ${getPatternColor(pattern.pattern)}`}>
                        {pattern.pattern}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pattern.confidence.toFixed(0)}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {pattern.reasoning.map((reason, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        • {reason}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Loading...</p>
              )}
            </div>
          </AnimatedCard>

          {/* Exchange Inflow */}
          <AnimatedCard delay={0.3}>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Exchange Inflow</h3>
              {summary ? (
                <>
                  <p className="text-3xl font-bold text-red-400 mb-2">
                    ${(summary.exchangeInflow / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {summary.inflowTxCount} transactions ({timeframe})
                  </p>
                  <p className="text-xs text-red-400">⚠️ Potential sell pressure</p>
                </>
              ) : (
                <p className="text-muted-foreground">Loading...</p>
              )}
            </div>
          </AnimatedCard>

          {/* Exchange Outflow */}
          <AnimatedCard delay={0.4}>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Exchange Outflow</h3>
              {summary ? (
                <>
                  <p className="text-3xl font-bold text-cyber-green mb-2">
                    ${(summary.exchangeOutflow / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {summary.outflowTxCount} transactions ({timeframe})
                  </p>
                  <p className="text-xs text-cyber-green">✅ Accumulation signal</p>
                </>
              ) : (
                <p className="text-muted-foreground">Loading...</p>
              )}
            </div>
          </AnimatedCard>
        </div>

        {/* Net Flow Indicator */}
        {summary && (
          <AnimatedCard delay={0.5}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Net Flow ({timeframe})</h3>
                <div className="flex gap-2">
                  {['1h', '24h', '7d'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf as '1h' | '24h' | '7d')}
                      className={`px-3 py-1 rounded text-sm transition-all ${
                        timeframe === tf
                          ? 'bg-cyber-blue text-black'
                          : 'bg-card/50 hover:bg-card'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="h-8 bg-card/50 rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(Math.abs(summary.netFlow) / (summary.exchangeInflow + summary.exchangeOutflow) * 100, 100)}%`,
                    }}
                    className={`h-full ${
                      summary.netFlow > 0
                        ? 'bg-gradient-to-r from-cyber-green to-green-600'
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{ marginLeft: summary.netFlow > 0 ? '50%' : undefined, marginRight: summary.netFlow < 0 ? '50%' : undefined }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-bold text-sm ${summary.netFlow > 0 ? 'text-cyber-green' : 'text-red-400'}`}>
                    {summary.netFlow > 0 ? '+' : ''}${(summary.netFlow / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>← Sell Pressure</span>
                <span>Accumulation →</span>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Transactions Table */}
        <AnimatedCard delay={0.6}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Whale Transactions</h3>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-green mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-6xl mb-4">🐋</p>
                <p className="text-muted-foreground">No whale transactions detected yet</p>
                <p className="text-sm text-muted-foreground mt-2">Monitoring blockchain every 60 seconds...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">From</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">To</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Significance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {transactions.map((tx, idx) => (
                        <motion.tr
                          key={tx.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-b border-border/50 hover:bg-card/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-bold text-cyber-blue">
                                ${(tx.amountUsd / 1000000).toFixed(2)}M
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tx.amount.toFixed(2)} {tx.symbol}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <p className="font-mono text-xs">{truncateAddress(tx.fromAddress)}</p>
                            {tx.fromOwner && (
                              <p className="text-xs text-muted-foreground">{tx.fromOwner}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <p className="font-mono text-xs">{truncateAddress(tx.toAddress)}</p>
                            {tx.toOwner && (
                              <p className="text-xs text-muted-foreground">{tx.toOwner}</p>
                            )}
                          </td>
                          <td className={`py-3 px-4 text-sm font-medium ${getTypeColor(tx.transactionType)}`}>
                            {tx.transactionType.replace(/_/g, ' ').toUpperCase()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSignificanceColor(tx.significance)}`}>
                              {tx.significance.toUpperCase()}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Info Card */}
        <AnimatedCard delay={0.7}>
          <div className="p-6 bg-gradient-to-r from-cyber-blue/10 to-purple-600/10 border border-cyber-blue/20">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>ℹ️</span> About Whale Monitoring
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="mb-2">
                  <span className="text-cyber-green font-semibold">Exchange Inflow:</span> Large amounts moving TO exchanges - potential sell pressure
                </p>
                <p>
                  <span className="text-cyber-green font-semibold">Exchange Outflow:</span> Large amounts moving FROM exchanges - accumulation/hodling
                </p>
              </div>
              <div>
                <p className="mb-2">
                  <span className="text-cyber-green font-semibold">Threshold:</span> Tracking transactions over $5M USD
                </p>
                <p>
                  <span className="text-cyber-green font-semibold">Update Frequency:</span> Blockchain scanned every 60 seconds
                </p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </PageTransition>
  )
}

export default WhaleMonitoring
