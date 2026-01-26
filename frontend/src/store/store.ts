import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import marketReducer from './slices/marketSlice'
import signalReducer from './slices/signalSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    market: marketReducer,
    signals: signalReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
