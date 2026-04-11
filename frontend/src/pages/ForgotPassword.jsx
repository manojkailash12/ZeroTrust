import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function ForgotPassword() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!email) return setStatus('⚠ Email required')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/forgot-password`, { email })
      setStatus('✅ OTP sent to your email')
      setTimeout(() => nav('/reset-password', { state: { email } }), 1200)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Email not found'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <h2>Forgot Password</h2>
        <p className="auth-sub">We'll send an OTP to your email</p>
        <input placeholder="Registered Email *" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="btn-auth" onClick={send} disabled={loading}>
          {loading ? '⏳ Sending...' : 'Send OTP'}
        </button>
        <button className="back-home" onClick={() => nav('/login')}>← Back to Login</button>
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
