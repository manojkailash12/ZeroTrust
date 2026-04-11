import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState('user')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!username || !password) return setStatus('⚠ All fields required')
    setLoading(true)
    setStatus('')
    try {
      const res = await axios.post(`${API}/login`, { username, password })
      const d = res.data

      if (mode === 'admin' && d.role !== 'admin') {
        setLoading(false)
        return setStatus('❌ Not authorized as admin')
      }

      localStorage.setItem('token',    d.access_token)
      localStorage.setItem('userId',   d.user_id)
      localStorage.setItem('role',     d.role)
      localStorage.setItem('username', d.username || username)
      localStorage.setItem('email',    d.email    || '')
      localStorage.setItem('mobile',   d.mobile   || '')
      localStorage.setItem('status',   d.status   || 'active')

      if (d.force_password_change) {
        nav('/change-password?forced=1')
      } else {
        nav(d.role === 'admin' ? '/admin' : '/dashboard')
      }
    } catch (err) {
      setLoading(false)
      const msg = err.response?.data?.detail || ''
      if (err.response?.status === 403 && msg.toLowerCase().includes('blocked')) {
        nav('/request-unblock')
      } else if (err.response?.status === 403) {
        nav('/verify')
      } else {
        setStatus('❌ Invalid credentials')
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔒</div>
        <h2>Welcome Back</h2>
        <p className="auth-sub">Sign in to your account</p>

        <div className="mode-tabs">
          <button className={mode === 'user' ? 'active' : ''} onClick={() => setMode('user')}>User</button>
          <button className={mode === 'admin' ? 'active' : ''} onClick={() => setMode('admin')}>Admin</button>
        </div>

        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        <div className="pwd-wrap">
          <input type={showPwd ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          <span onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</span>
        </div>

        <button className="btn-auth" onClick={login} disabled={loading}>
          {loading ? '⏳ Signing in...' : 'Sign In'}
        </button>

        {mode === 'user' && (
          <div className="auth-links">
            <span onClick={() => nav('/register')}>Create account</span>
            <span onClick={() => nav('/forgot')}>Forgot password?</span>
          </div>
        )}

        <button className="back-home" onClick={() => nav('/')}>← Back to Home</button>
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
