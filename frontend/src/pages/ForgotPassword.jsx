import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../api'
import '../styles/auth.css'

export default function ForgotPassword() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    if (!username || !email) return setStatus('⚠ All fields required')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/forgot-password`, { username, email })
      setStatus('✅ OTP sent to your email')
      setStep(2)
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || 'Username or email not found'}`)
    } finally {
      setLoading(false)
    }
  }

  const resetPwd = async () => {
    if (!otp || !newPwd) return setStatus('⚠ All fields required')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/reset-password`, { email, otp, new_password: newPwd })
      setStatus('✅ Password reset successfully! Redirecting...')
      setTimeout(() => nav('/login'), 1500)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Invalid OTP'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {step === 1 && (
          <>
            <div className="auth-logo">🔑</div>
            <h2>Forgot Password</h2>
            <p className="auth-sub">Enter your username and registered email to receive an OTP</p>
            <input
              placeholder="Username *"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
            />
            <input
              placeholder="Registered Email *"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
            />
            <button className="btn-auth" onClick={sendOtp} disabled={loading}>
              {loading ? '⏳ Sending...' : 'Send OTP'}
            </button>
            <button className="back-home" onClick={() => nav('/login')}>← Back</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-logo">🔐</div>
            <h2>Reset Password</h2>
            <p className="auth-sub">Enter the OTP sent to your email and set a new password</p>
            <input
              placeholder="OTP *"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              style={{ letterSpacing: 4, textAlign: 'center', fontSize: '1.1rem' }}
              onKeyDown={e => e.key === 'Enter' && resetPwd()}
            />
            <div className="pwd-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="New Password *"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && resetPwd()}
              />
              <span onClick={() => setShowPwd(v => !v)}>{showPwd ? '🙈' : '👁️'}</span>
            </div>
            <button className="btn-auth" onClick={resetPwd} disabled={loading}>
              {loading ? '⏳ Resetting...' : 'Reset Password'}
            </button>
            <button className="back-home" onClick={() => { setStep(1); setStatus('') }}>← Back</button>
          </>
        )}

        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
