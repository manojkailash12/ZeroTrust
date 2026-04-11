import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function ResetPassword() {
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState(loc.state?.email || '')
  const [otp, setOtp] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = async () => {
    if (!email || !otp || !newPwd) return setStatus('⚠ All fields required')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/reset-password`, { email, otp, new_password: newPwd })
      setStatus('✅ Password reset! Redirecting...')
      setTimeout(() => nav('/login'), 1500)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Invalid OTP'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔐</div>
        <h2>Reset Password</h2>
        <p className="auth-sub">Enter the OTP and your new password</p>
        <input placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="OTP *" value={otp} onChange={e => setOtp(e.target.value)} />
        <input type="password" placeholder="New Password *" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        <button className="btn-auth" onClick={reset} disabled={loading}>
          {loading ? '⏳ Resetting...' : 'Reset Password'}
        </button>
        <button className="back-home" onClick={() => nav('/login')}>← Back to Login</button>
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
