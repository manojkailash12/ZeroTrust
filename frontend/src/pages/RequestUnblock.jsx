import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function RequestUnblock() {
  const nav = useNavigate()
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState(localStorage.getItem('email') || '')
  const [reason, setReason] = useState('')
  const [key, setKey] = useState('')
  const [verifyEmail, setVerifyEmail] = useState(localStorage.getItem('email') || '')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const goBack = () => {
    const token = localStorage.getItem('token')
    const role  = localStorage.getItem('role')
    if (token) {
      nav(role === 'admin' ? '/admin' : '/dashboard')
    } else {
      nav('/login')
    }
  }

  const submitRequest = async () => {
    if (!email) return setStatus('⚠ Email is required')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/request-unblock`, { email, reason })
      setVerifyEmail(email)
      setStatus('✅ Unblock key sent to your email! Check your inbox.')
      setStep('verify')
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || 'Failed to submit'}`)
    } finally {
      setLoading(false)
    }
  }

  const verifyKey = async () => {
    if (!verifyEmail || !key) return setStatus('⚠ Enter your email and the key from email')
    setLoading(true)
    setStatus('')
    try {
      const res = await axios.post(`${API}/verify-unblock-key`, { email: verifyEmail, key })
      const d = res.data
      localStorage.setItem('token',    d.access_token)
      localStorage.setItem('userId',   d.user_id)
      localStorage.setItem('role',     d.role)
      localStorage.setItem('username', d.username)
      localStorage.setItem('email',    d.email)
      localStorage.setItem('mobile',   d.mobile || '')
      localStorage.setItem('status',   'active')
      setStatus('✅ Account unblocked! Redirecting...')
      setTimeout(() => nav('/change-password?forced=1'), 1200)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Invalid key'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ width: 420 }}>
        <div className="auth-logo">🚫</div>
        <h2 style={{ color: '#ef4444' }}>Account Blocked</h2>

        <div className="mode-tabs" style={{ marginBottom: 16 }}>
          <button className={step === 'request' ? 'active' : ''} onClick={() => setStep('request')}>
            1. Request Unblock
          </button>
          <button className={step === 'verify' ? 'active' : ''} onClick={() => setStep('verify')}>
            2. Enter Key
          </button>
        </div>

        {step === 'request' && (
          <>
            <p className="auth-sub">Enter your registered email — an unblock key will be sent to it instantly.</p>
            <input
              placeholder="Your Email *"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <textarea
              placeholder="Reason (optional)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', margin: '6px 0', borderRadius: 8, border: '1.5px solid #e5e7eb', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <button className="btn-auth" onClick={submitRequest} disabled={loading}>
              {loading ? '⏳ Sending key...' : 'Send Unblock Key'}
            </button>
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <span style={{ color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer' }} onClick={() => setStep('verify')}>
                Already have a key? Enter it →
              </span>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="auth-sub">Enter the unblock key sent to your email.</p>
            <input
              placeholder="Your Email *"
              type="email"
              value={verifyEmail}
              onChange={e => setVerifyEmail(e.target.value)}
            />
            <input
              placeholder="Unblock Key (from email) *"
              value={key}
              onChange={e => setKey(e.target.value)}
              style={{ letterSpacing: 4, textAlign: 'center', fontSize: '1.1rem' }}
            />
            <button className="btn-auth" onClick={verifyKey} disabled={loading}>
              {loading ? '⏳ Verifying...' : 'Verify & Unblock'}
            </button>
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <span style={{ color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer' }} onClick={() => setStep('request')}>
                ← Back to request
              </span>
            </div>
          </>
        )}

        <button className="back-home" onClick={goBack}>
          {localStorage.getItem('token') ? '← Back to Dashboard' : '← Back to Login'}
        </button>
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
