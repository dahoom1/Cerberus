import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../store/store'
import { fetchSignals, generateSignal } from '../store/slices/signalSlice'

const Signals = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { signals, loading } = useSelector((state: RootState) => state.signals)
  const [generating, setGenerating] = useState(false)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trading Signals</h1>
        <p className="mt-2 text-muted-foreground">Generate and view trading signals</p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">Generate Signal</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Exchange</label>
              <select
                value={formData.exchange}
                onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Timeframe</label>
              <select
                value={formData.timeframe}
                onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
          <button
            type="submit"
            disabled={generating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Signal'}
          </button>
        </form>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">All Signals</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : signals.length === 0 ? (
          <p className="text-muted-foreground">No signals yet. Generate your first signal!</p>
        ) : (
          <div className="space-y-4">
            {signals.map((signal) => (
              <div key={signal.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {signal.symbol} - {signal.exchange}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <span className={`font-medium ${
                        signal.signalType === 'BUY' ? 'text-green-600' : 
                        signal.signalType === 'SELL' ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {signal.signalType}
                      </span>
                      {' • '}Confidence: {signal.confidence.toFixed(0)}%
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

export default Signals
