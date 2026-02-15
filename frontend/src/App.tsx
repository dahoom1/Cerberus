import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'
import { CardSkeleton } from './components/SkeletonLoader'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Signals = lazy(() => import('./pages/Signals'))
const Liquidation = lazy(() => import('./pages/Liquidation'))
const Indicators = lazy(() => import('./pages/Indicators'))

function App() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-4">
          <CardSkeleton />
        </div>
      </div>
    }>
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
    </Suspense>
  )
}

export default App
