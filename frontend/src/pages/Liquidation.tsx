import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface LiquidationZone {
  id: string
  symbol: string
  exchange: string
  price: number
  side: string
  estimatedLiquidity: number
  confidence: number
  detectedAt: string
}

const Liquidation = () => {
  const [zones, setZones] = useState<LiquidationZone[]>([])
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Liquidation Zones</h1>
        <p className="mt-2 text-muted-foreground">Detect potential liquidation hunt zones</p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">Detect Zones</h2>
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
          <div className="flex items-end">
            <button
              onClick={fetchZones}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Detecting...' : 'Detect Zones'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">Detected Zones</h2>
        {zones.length === 0 ? (
          <p className="text-muted-foreground">No liquidation zones detected. Try detecting zones for a symbol.</p>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id || `${zone.exchange}-${zone.symbol}-${zone.price}`} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {zone.symbol} - {zone.exchange}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <span className={`font-medium ${
                        zone.side === 'LONG' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {zone.side} Liquidation
                      </span>
                      {' • '}Price: ${zone.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {zone.confidence.toFixed(0)}% • 
                      Est. Liquidity: ${zone.estimatedLiquidity.toFixed(2)}
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

export default Liquidation
