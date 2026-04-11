import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function Verify() {
  const nav = useNavigate()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    if (!token) return setStatus('⚠ Enter the OTP/token')
    setLoading(true)
    setStatus('')
    try {
      const res = await axios.post(`${API}/verify-user`, { token })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('userId', res.data.user_id)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('username', token.slice(0, 8))
      setStatus('✅ Verified! Redirecting...')
      setTimeout(() => nav(res.data.role === 'admin' ? '/admin' : '/dashboard'), 1200)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Invalid token'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✉️</div>
        <h2>Verify Account</h2>
        <p className="auth-sub">Enter the OTP sent to your email</p>
        <input placeholder="OTP / Verification Token *" value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()} />
        <button className="btn-auth" onClick={verify} disabled={loading}>
          {loading ? '⏳ Verifying...' : 'Verify'}
        </button>
        <button className="back-home" onClick={() => nav('/login')}>← Back to Login</button>
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
