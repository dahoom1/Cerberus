import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MarketData {
  exchange: string
  symbol: string
  type: 'ticker' | 'orderbook'
  data: any
  timestamp: number
}

interface MarketState {
  marketData: Record<string, MarketData>
  subscriptions: string[]
}

const initialState: MarketState = {
  marketData: {},
  subscriptions: [],
}

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    updateMarketData: (state, action: PayloadAction<MarketData>) => {
      const key = `${action.payload.exchange}:${action.payload.symbol}:${action.payload.type}`
      state.marketData[key] = action.payload
    },
    subscribe: (state, action: PayloadAction<string>) => {
      if (!state.subscriptions.includes(action.payload)) {
        state.subscriptions.push(action.payload)
      }
    },
    unsubscribe: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter((sub) => sub !== action.payload)
    },
  },
})

export const { updateMarketData, subscribe, unsubscribe } = marketSlice.actions
export default marketSlice.reducer
