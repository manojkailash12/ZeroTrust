import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, authHeaders } from '../../api'
import AdminLayout from '../../components/AdminLayout'

export default function AdminNotifications() {
  const nav = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState({})
  const [unblocking, setUnblocking] = useState({})

  const load = () => axios.get(`${API}/admin/notifications`).then(r => setAlerts(r.data)).catch(() => nav('/login'))

  useEffect(() => { load() }, [])

  const sendKey = async (username) => {
    setSending(s => ({ ...s, [username]: true }))
    try {
      await axios.post(`${API}/admin/send-unblock-key/${username}`, {}, authHeaders())
      setStatus(`✅ Unblock key sent to ${username}'s email.`)
      load()
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || 'Failed to send key'}`)
    } finally {
      setSending(s => ({ ...s, [username]: false }))
    }
  }

  const unblockUser = async (username) => {
    setUnblocking(s => ({ ...s, [username]: true }))
    try {
      await axios.post(`${API}/admin/unblock/${username}`, {}, authHeaders())
      setStatus(`✅ ${username} has been unblocked.`)
      load()
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || 'Failed to unblock'}`)
    } finally {
      setUnblocking(s => ({ ...s, [username]: false }))
    }
  }

  return (
    <AdminLayout>
      <h1 className="page-title">🚨 Security Alerts</h1>

      {status && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600 }}>
          {status}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="section-card" style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
          <p>No active alerts. All clear!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderLeft: '4px solid #ef4444',
              borderRadius: 10,
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem' }}>{a.username}</span>
                    <span className="badge badge-red">{a.risk_level}</span>
                    {a.unblock_requested && <span className="badge badge-yellow">🔔 Unblock Requested</span>}
                  </div>
                  <p style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: '0.88rem' }}>{a.message}</p>
                  {a.unblock_reason && (
                    <p style={{ margin: '0 0 6px', color: '#fbbf24', fontSize: '0.83rem' }}>
                      📝 User reason: "{a.unblock_reason}"
                    </p>
                  )}
                  <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    {new Date(a.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-sm btn-success"
                    onClick={() => unblockUser(a.username)}
                    disabled={unblocking[a.username]}
                  >
                    {unblocking[a.username] ? '⏳' : '🔓 Unblock Now'}
                  </button>
                  <button
                    className="btn-sm btn-warning"
                    onClick={() => sendKey(a.username)}
                    disabled={sending[a.username]}
                    title="Send a 6-digit unblock key to user's email"
                  >
                    {sending[a.username] ? '⏳ Sending...' : '📧 Send Key'}
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
                    or send key for self-service
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
