import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', mobile: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const register = async () => {
    if (!form.username || !form.email || !form.mobile || !form.password)
      return setStatus('⚠ All fields required')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/register`, form)
      setStatus('✅ OTP sent to your email')
      setTimeout(() => nav('/verify'), 1200)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Registration failed'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🛡️</div>
        <h2>Create Account</h2>
        <p className="auth-sub">Join the Zero Trust platform</p>

        <input placeholder="Username *" value={form.username} onChange={set('username')} />
        <input placeholder="Email *" value={form.email} onChange={set('email')} />
        <input placeholder="Mobile *" value={form.mobile} onChange={set('mobile')} />
        <div className="pwd-wrap">
          <input type={showPwd ? 'text' : 'password'} placeholder="Password *" value={form.password} onChange={set('password')} />
          <span onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</span>
        </div>

        <button className="btn-auth" onClick={register} disabled={loading}>
          {loading ? '⏳ Registering...' : 'Register'}
        </button>
        <div className="auth-links">
          <span onClick={() => nav('/login')}>Already have an account? Sign in</span>
        </div>
        <button className="back-home" onClick={() => nav('/')}>← Back to Home</button>
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
