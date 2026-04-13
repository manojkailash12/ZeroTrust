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

  // Blocked flow state
  const [blocked, setBlocked] = useState(false)
  const [blockedEmail, setBlockedEmail] = useState('')
  const [key, setKey] = useState('')
  const [requesting, setRequesting] = useState(false)

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
        // Show key entry inline — fetch email from backend to pre-fill
        setBlocked(true)
        setStatus('')
        // Try to get email by looking up the user (best effort)
        try {
          const r = await axios.post(`${API}/get-blocked-email`, { username })
          setBlockedEmail(r.data.email || '')
        } catch {
          setBlockedEmail('')
        }
      } else if (err.response?.status === 403) {
        nav('/verify')
      } else {
        setStatus('❌ Invalid credentials')
      }
    }
  }

  const verifyKey = async () => {
    if (!key) return setStatus('⚠ Enter the unblock key from your email')
    setLoading(true)
    setStatus('')
    try {
      const res = await axios.post(`${API}/verify-unblock-key`, { email: blockedEmail, key })
      const d = res.data
      localStorage.setItem('token',    d.access_token)
      localStorage.setItem('userId',   d.user_id)
      localStorage.setItem('role',     d.role)
      localStorage.setItem('username', d.username)
      localStorage.setItem('email',    d.email)
      localStorage.setItem('mobile',   d.mobile || '')
      localStorage.setItem('status',   'active')
      setStatus('✅ Account unblocked! Redirecting...')
      setTimeout(() => nav('/change-password?forced=1'), 1000)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Invalid key'}`)
    }
  }

  const requestKey = async () => {
    if (!blockedEmail) return setStatus('⚠ Email not found. Please contact admin.')
    setRequesting(true)
    setStatus('')
    try {
      await axios.post(`${API}/request-unblock`, { email: blockedEmail, reason: 'Requested from login page' })
      setStatus('✅ Unblock key sent to your email! Enter it below.')
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || 'Failed to send key'}`)
    } finally {
      setRequesting(false)
    }
  }

  // ── Blocked screen ──
  if (blocked) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">🔐</div>
          <h2 style={{ color: '#ef4444' }}>Account Blocked</h2>
          <p className="auth-sub">
            Your account is blocked. Enter the unblock key sent to your email by the admin.
          </p>

          <input
            placeholder="Unblock Key *"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyKey()}
            style={{ letterSpacing: 4, textAlign: 'center', fontSize: '1.1rem' }}
          />

          <button className="btn-auth" onClick={verifyKey} disabled={loading}>
            {loading ? '⏳ Verifying...' : 'Verify & Login'}
          </button>

          <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
            Don't have a key?{' '}
            <span
              style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
              onClick={requestKey}
            >
              {requesting ? '⏳ Sending...' : 'Request key via email'}
            </span>
          </div>

          <button className="back-home" style={{ marginTop: 14 }} onClick={() => { setBlocked(false); setKey(''); setStatus('') }}>
            ← Back to Login
          </button>
          {status && <p className="auth-status">{status}</p>}
        </div>
      </div>
    )
  }

  // ── Normal login screen ──
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
