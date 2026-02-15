import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { AppDispatch, RootState } from '../store/store'
import { fetchSignals } from '../store/slices/signalSlice'
import { io } from 'socket.io-client'
import PageTransition from '../components/PageTransition'
import AnimatedCard from '../components/AnimatedCard'

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const signals = useSelector((state: RootState) => state.signals.signals)
  const user = useSelector((state: RootState) => state.auth.user)

  useEffect(() => {
    dispatch(fetchSignals())

    // Connect to WebSocket
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
    })

    socket.on('market-data', (data) => {
      console.log('Market data received:', data)
    })

    socket.on('liquidation-alert', (data) => {
      console.log('Liquidation alert:', data)
    })

    return () => {
      socket.disconnect()
    }
  }, [dispatch])

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Animated header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {user?.firstName || user?.email}
          </p>
        </motion.div>

        {/* Stats grid with staggered animations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatedCard delay={0.1} glass hover>
            <h3 className="text-lg font-semibold text-card-foreground">Recent Signals</h3>
            <p className="text-3xl font-bold text-gradient mt-2">{signals.length}</p>
          </AnimatedCard>

          <AnimatedCard delay={0.2} glass hover>
            <h3 className="text-lg font-semibold text-card-foreground">Subscription Tier</h3>
            <p className="text-lg text-cyber-purple font-semibold mt-2">{user?.subscriptionTier}</p>
          </AnimatedCard>

          <AnimatedCard delay={0.3} glass hover>
            <h3 className="text-lg font-semibold text-card-foreground">Email Status</h3>
            <p className="text-lg text-cyber-green font-semibold mt-2">
              {user?.isEmailVerified ? '✓ Verified' : '⚠ Not Verified'}
            </p>
          </AnimatedCard>
        </div>

        {/* Signals section */}
        <AnimatedCard delay={0.4} glass>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Latest Trading Signals</h2>
          {signals.length === 0 ? (
            <p className="text-muted-foreground">No signals yet. Generate your first signal!</p>
          ) : (
            <div className="space-y-4">
              {signals.slice(0, 5).map((signal, idx) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ x: 5, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.2)' }}
                  className="border border-white/10 rounded-lg p-4 bg-gradient-to-r from-card to-card/50 hover-glow cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {signal.symbol} - {signal.exchange}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <span className={signal.signalType === 'BUY' ? 'text-cyber-green' : signal.signalType === 'SELL' ? 'text-red-500' : ''}>
                          {signal.signalType}
                        </span> • Confidence: <span className="text-gradient font-semibold">{signal.confidence.toFixed(0)}%</span>
                      </p>
                      {signal.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{signal.reason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${signal.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(signal.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </div>
    </PageTransition>
  )
}

export default Dashboard
