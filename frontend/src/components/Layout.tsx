import { Outlet, Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { logout } from '../store/slices/authSlice'
import { RootState } from '../store/store'
import ParticleBackground from './ParticleBackground'

const Layout = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector((state: RootState) => state.auth.user)

  const handleLogout = () => {
    dispatch(logout())
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Signals', href: '/signals' },
    { name: 'Liquidation', href: '/liquidation' },
    { name: 'Indicators', href: '/indicators' },
    { name: 'Profile', href: '/profile' },
  ]

  return (
    <div className="min-h-screen bg-background relative">
      {/* Particle background */}
      <ParticleBackground />

      {/* Gradient background overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cyber-purple/5 via-background to-cyber-blue/5 pointer-events-none" />

      {/* Glassmorphic navigation */}
      <nav className="border-b border-white/10 glass dark:glass-dark sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xl font-bold text-gradient"
                >
                  Crypto Trading Intelligence
                </motion.h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
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
            <div className="flex items-center space-x-4">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground"
              >
                {user?.email}
              </motion.span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyber-purple to-cyber-blue text-white rounded-md hover-glow"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
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
