import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface TradingSignal {
  id: string
  symbol: string
  exchange: string
  signalType: string
  confidence: number
  price: number
  timestamp: string
  reason?: string
}

interface SignalState {
  signals: TradingSignal[]
  loading: boolean
  error: string | null
}

const initialState: SignalState = {
  signals: [],
  loading: false,
  error: null,
}

export const fetchSignals = createAsyncThunk('signals/fetch', async () => {
  const token = localStorage.getItem('accessToken')
  const response = await axios.get(`${API_URL}/signals`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data.signals
})

export const generateSignal = createAsyncThunk(
  'signals/generate',
  async (params: { exchange: string; symbol: string; timeframe?: string }) => {
    const token = localStorage.getItem('accessToken')
    const response = await axios.post(
      `${API_URL}/signals/generate`,
      params,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data.signal
  }
)

const signalSlice = createSlice({
  name: 'signals',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSignals.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSignals.fulfilled, (state, action) => {
        state.loading = false
        state.signals = action.payload
      })
      .addCase(fetchSignals.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch signals'
      })
      .addCase(generateSignal.fulfilled, (state, action) => {
        state.signals.unshift(action.payload)
      })
  },
})

export default signalSlice.reducer
