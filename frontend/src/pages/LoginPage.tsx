'use client'
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Sai username hoặc password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vib-gray flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-vib-blue rounded-lg mx-auto mb-3 flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">DevOps Ecosystem</h1>
          <p className="text-sm text-gray-500 mt-1">VIB Internal Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vib-blue"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vib-blue"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vib-blue text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
