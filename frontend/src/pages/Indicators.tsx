import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Technical Indicators</h1>
        <p className="mt-2 text-muted-foreground">View calculated technical indicators</p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">Calculate Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>
        <button
          onClick={fetchIndicators}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate Indicators'}
        </button>
      </div>

      {indicators && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Indicator Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(indicators).map(([key, value]: [string, any]) => {
              if (Array.isArray(value) && value.length > 0) {
                const lastValue = value[value.length - 1]
                return (
                  <div key={key} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-2">{key.toUpperCase()}</h3>
                    {typeof lastValue === 'object' ? (
                      <pre className="text-xs text-muted-foreground overflow-auto">
                        {JSON.stringify(lastValue, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-lg font-bold text-primary">{lastValue?.toFixed?.(4) || lastValue}</p>
                    )}
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Indicators
