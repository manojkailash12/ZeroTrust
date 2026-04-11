import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios, { API, authHeaders } from '../api'
import '../styles/auth.css'

export default function ChangePassword() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const forced = params.get('forced') === '1'
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const change = async () => {
    if (!oldPwd || !newPwd || !confirm) return setStatus('⚠ All fields required')
    if (newPwd !== confirm) return setStatus('⚠ Passwords do not match')
    if (newPwd.length < 6) return setStatus('⚠ Password must be at least 6 characters')
    setLoading(true)
    setStatus('')
    try {
      await axios.post(`${API}/change-password`, { old_password: oldPwd, new_password: newPwd }, authHeaders())
      setStatus('✅ Password changed successfully!')
      const role = localStorage.getItem('role')
      setTimeout(() => nav(role === 'admin' ? '/admin' : '/dashboard'), 1200)
    } catch (err) {
      setLoading(false)
      setStatus(`❌ ${err.response?.data?.detail || 'Failed to change password'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <h2>Change Password</h2>
        {forced && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.85rem', color: '#92400e' }}>
            ⚠ For security, you must change your password before continuing.
          </div>
        )}
        <input type="password" placeholder="Current Password *" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
        <input type="password" placeholder="New Password *" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        <input type="password" placeholder="Confirm New Password *" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <button className="btn-auth" onClick={change} disabled={loading}>
          {loading ? '⏳ Changing...' : 'Change Password'}
        </button>
        {!forced && <button className="back-home" onClick={() => nav(-1)}>← Back</button>}
        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
