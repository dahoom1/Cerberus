import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { register } from '../store/slices/authSlice'
import { AppDispatch } from '../store/store'
import AnimatedButton from '../components/AnimatedButton'

const Register = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await dispatch(register(formData)).unwrap()
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-purple/10 via-background to-cyber-blue/10 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyber-pink/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyber-cyan/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      {/* Form container with glass effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 relative z-10"
      >
        <div className="glass dark:glass-dark rounded-2xl p-8 shadow-glow-lg">
          {/* Animated title */}
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-3xl font-extrabold text-gradient"
          >
            Create your account
          </motion.h2>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* Error message with animation */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg shadow-glow-red"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Animated first name input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </motion.div>

              {/* Animated last name input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </motion.div>

              {/* Animated email input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </motion.div>

              {/* Animated password input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200 backdrop-blur-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
                <p className="mt-2 text-xs text-muted-foreground">Minimum 8 characters</p>
              </motion.div>
            </div>

            {/* Animated submit button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <AnimatedButton
                type="submit"
                variant="primary"
                isLoading={loading}
                className="w-full"
              >
                Sign up
              </AnimatedButton>
            </motion.div>

            {/* Sign in link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-sm"
            >
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="font-medium text-cyber-purple hover:text-cyber-blue transition-colors">
                Sign in
              </Link>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default Register
