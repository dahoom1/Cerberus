import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Signals from './pages/Signals'
import Liquidation from './pages/Liquidation'
import Indicators from './pages/Indicators'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

function App() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/verify-email" element={<div>Email Verification</div>} />
      <Route path="/reset-password" element={<div>Reset Password</div>} />
      
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/liquidation" element={<Liquidation />} />
        <Route path="/indicators" element={<Indicators />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App
