import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import axios from 'axios'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your account and API keys</p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">User Information</h2>
        <div className="space-y-2">
          <p><span className="font-medium">Email:</span> {user?.email}</p>
          <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
          <p><span className="font-medium">Subscription:</span> {user?.subscriptionTier}</p>
          <p><span className="font-medium">Email Verified:</span> {user?.isEmailVerified ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">Exchange API Keys</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {showAddForm ? 'Cancel' : 'Add API Key'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddApiKey} className="mb-6 p-4 border rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Exchange</label>
              <select
                value={formData.exchange}
                onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
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
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">API Secret</label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Passphrase (if required)</label>
              <input
                type="password"
                value={formData.passphrase}
                onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add API Key'}
            </button>
          </form>
        )}

        {apiKeys.length === 0 ? (
          <p className="text-muted-foreground">No API keys added yet.</p>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div key={key.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-foreground">{key.exchange}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {key.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteApiKey(key.id)}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
