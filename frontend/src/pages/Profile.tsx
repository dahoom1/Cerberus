import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { RootState } from '../store/store'
import axios from 'axios'
import PageTransition from '../components/PageTransition'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface ApiKey {
  id: string
  exchange: string
  isActive: boolean
  createdAt: string
}

const Profile = () => {
  const user = useSelector((state: RootState) => state.auth.user)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    exchange: 'BINANCE',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
  })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('accessToken')
    try {
      const response = await axios.get(`${API_URL}/user/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setApiKeys(response.data.apiKeys || [])
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const token = localStorage.getItem('accessToken')
    try {
      await axios.post(
        `${API_URL}/user/api-keys`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      setShowAddForm(false)
      setFormData({ exchange: 'BINANCE', apiKey: '', apiSecret: '', passphrase: '' })
      fetchApiKeys()
    } catch (error) {
      console.error('Failed to add API key:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteApiKey = async (id: string) => {
    const token = localStorage.getItem('accessToken')
    try {
      await axios.delete(`${API_URL}/user/api-keys/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchApiKeys()
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Animated header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gradient">Profile</h1>
          <p className="mt-2 text-muted-foreground">Manage your account and API keys</p>
        </motion.div>

        {/* User info */}
        <AnimatedCard delay={0.1} glass hover>
          <h2 className="text-xl font-semibold text-card-foreground mb-4">User Information</h2>
          <div className="space-y-3">
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <span className="font-medium text-cyber-purple">Email:</span> <span className="text-foreground">{user?.email}</span>
            </motion.p>
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <span className="font-medium text-cyber-purple">Name:</span> <span className="text-foreground">{user?.firstName} {user?.lastName}</span>
            </motion.p>
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <span className="font-medium text-cyber-purple">Subscription:</span> <span className="text-foreground">{user?.subscriptionTier}</span>
            </motion.p>
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <span className="font-medium text-cyber-purple">Email Verified:</span> <span className={user?.isEmailVerified ? 'text-cyber-green' : 'text-red-500'}>{user?.isEmailVerified ? '✓ Yes' : '✗ No'}</span>
            </motion.p>
          </div>
        </AnimatedCard>

        {/* API Keys */}
        <AnimatedCard delay={0.2} glass>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-card-foreground">Exchange API Keys</h2>
            <AnimatedButton
              onClick={() => setShowAddForm(!showAddForm)}
              variant="primary"
            >
              {showAddForm ? 'Cancel' : 'Add API Key'}
            </AnimatedButton>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddApiKey}
                className="mb-6 p-4 border border-white/10 rounded-lg space-y-4 bg-card/30"
              >
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Exchange</label>
                  <select
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                    className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200"
                    required
                  >
                    <option value="BINANCE">Binance</option>
                    <option value="BYBIT">Bybit</option>
                    <option value="OKX">OKX</option>
                    <option value="KRAKEN">Kraken</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">API Key</label>
                  <input
                    type="text"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">API Secret</label>
                  <input
                    type="password"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Passphrase (if required)</label>
                  <input
                    type="password"
                    value={formData.passphrase}
                    onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                    className="w-full px-4 py-3 bg-card/50 border border-white/10 rounded-lg focus:border-cyber-purple focus:ring-2 focus:ring-cyber-purple/50 transition-all duration-200"
                  />
                </div>
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                >
                  Add API Key
                </AnimatedButton>
              </motion.form>
            )}
          </AnimatePresence>

          {apiKeys.length === 0 ? (
            <p className="text-muted-foreground">No API keys added yet.</p>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key, idx) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ x: 5, boxShadow: '0 4px 20px rgba(147, 51, 234, 0.2)' }}
                  className="border border-white/10 rounded-lg p-4 flex justify-between items-center bg-gradient-to-r from-card to-card/50 hover-glow"
                >
                  <div>
                    <p className="font-semibold text-gradient">{key.exchange}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className={key.isActive ? 'text-cyber-green' : 'text-red-500'}>{key.isActive ? '✓ Active' : '✗ Inactive'}</span>
                    </p>
                  </div>
                  <AnimatedButton
                    onClick={() => handleDeleteApiKey(key.id)}
                    variant="destructive"
                  >
                    Delete
                  </AnimatedButton>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </div>
    </PageTransition>
  )
}

export default Profile
