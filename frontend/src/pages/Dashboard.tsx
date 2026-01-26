import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../store/store'
import { fetchSignals } from '../store/slices/signalSlice'
import { io } from 'socket.io-client'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user?.firstName || user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground">Recent Signals</h3>
          <p className="text-3xl font-bold text-primary mt-2">{signals.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground">Subscription Tier</h3>
          <p className="text-lg text-muted-foreground mt-2">{user?.subscriptionTier}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground">Email Status</h3>
          <p className="text-lg text-muted-foreground mt-2">
            {user?.isEmailVerified ? 'Verified' : 'Not Verified'}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">Latest Trading Signals</h2>
        {signals.length === 0 ? (
          <p className="text-muted-foreground">No signals yet. Generate your first signal!</p>
        ) : (
          <div className="space-y-4">
            {signals.slice(0, 5).map((signal) => (
              <div key={signal.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {signal.symbol} - {signal.exchange}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {signal.signalType} • Confidence: {signal.confidence.toFixed(0)}%
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
