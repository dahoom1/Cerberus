import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { logout } from '../store/slices/authSlice'
import { RootState } from '../store/store'
import ParticleBackground from './ParticleBackground'

const Layout = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector((state: RootState) => state.auth.user)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Signals', href: '/signals' },
    { name: 'Liquidation', href: '/liquidation' },
    { name: 'Whale Monitoring', href: '/whale-monitoring' },
    { name: 'Indicators', href: '/indicators' },
    { name: 'Profile', href: '/profile' },
  ]

  return (
    <div className="min-h-screen bg-background relative">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(138, 43, 226, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#0ff',
              secondary: '#1a1a2e',
            },
          },
          error: {
            iconTheme: {
              primary: '#f00',
              secondary: '#1a1a2e',
            },
          },
        }}
      />

      {/* Particle background */}
      <ParticleBackground />

      {/* Gradient background overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cyber-purple/5 via-background to-cyber-blue/5 pointer-events-none" />

      {/* Glassmorphic navigation */}
      <nav className="border-b border-white/10 glass dark:glass-dark sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-lg sm:text-xl font-bold text-gradient"
                >
                  Crypto Trading
                </motion.h1>
              </div>
              {/* Desktop navigation */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navigation.map((item, idx) => {
                  const isActive = location.pathname === item.href
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Link
                        to={item.href}
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'border-cyber-purple text-foreground shadow-glow-sm'
                            : 'border-transparent text-muted-foreground hover:border-cyber-blue hover:text-foreground'
                        }`}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* User email - hidden on small screens */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="hidden sm:block text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none"
              >
                {user?.email}
              </motion.span>

              {/* Logout button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gradient-to-r from-cyber-purple to-cyber-blue text-white rounded-md hover-glow"
              >
                Logout
              </motion.button>

              {/* Mobile menu button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/10"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item, idx) => {
                  const isActive = location.pathname === item.href
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-cyber-purple/20 text-cyber-purple border-l-4 border-cyber-purple'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        }`}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  )
                })}
                {/* User info in mobile menu */}
                <div className="sm:hidden pt-4 pb-2 px-3 border-t border-white/10 mt-2">
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main content with page transitions */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
    </div>
  )
}

export default Layout
