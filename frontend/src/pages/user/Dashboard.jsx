import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, getSession } from '../../api'
import UserLayout from '../../components/UserLayout'

function getBrowser() {
  const ua = navigator.userAgent
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  return 'Unknown'
}

function getDevice() {
  return /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
}

export default function UserDashboard() {
  const nav = useNavigate()
  const session = getSession()
  const [profile, setProfile] = useState({ username: session.username, status: session.status || 'active' })
  const [risk, setRisk] = useState(null)
  const [autoOn, setAutoOn] = useState(true)
  const [lastCapture, setLastCapture] = useState(null)
  const intervalRef = useRef(null)

  // Load profile once — render instantly from cache, refresh silently
  useEffect(() => {
    axios.get(`${API}/profile`).then(r => {
      setProfile(r.data)
      localStorage.setItem('status', r.data.status)
    }).catch(() => nav('/login'))
  }, [])

  const runCycle = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    const device = `${getDevice()}_${getBrowser()}`
    const browser = getBrowser()
    const speed = parseFloat((0.5 + Math.random() * 4.5).toFixed(2))
    const ts = new Date()

    try {
      // Log behavior — backend resolves real IP + location
      const logRes = await axios.post(`${API}/log-behavior`, {
        user_id: userId,
        location: '',   // backend auto-resolves from IP
        device,
        access_speed: speed,
        browser,
      })

      // Capture what was actually logged
      setLastCapture({
        userId,
        location: logRes.data?.location || '—',
        device,
        browser,
        speed,
        timestamp: ts.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      })

      const res = await axios.post(`${API}/analyze-risk/${userId}`, {})
      setRisk(res.data)

      if (res.data.risk_level === 'High') {
        clearInterval(intervalRef.current)
        setAutoOn(false)
        localStorage.setItem('status', 'blocked')
        setTimeout(() => nav('/request-unblock'), 1500)
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        clearInterval(intervalRef.current)
        localStorage.setItem('status', 'blocked')
        nav('/request-unblock')
      }
    }
  }

  useEffect(() => {
    if (!autoOn) { clearInterval(intervalRef.current); return }
    runCycle()
    intervalRef.current = setInterval(runCycle, 10000)
    return () => clearInterval(intervalRef.current)
  }, [autoOn])

  const riskColor = r => r === 'High' ? '#ef4444' : r === 'Medium' ? '#f59e0b' : '#22c55e'
  const riskBadge = r => r === 'High' ? 'badge-red' : r === 'Medium' ? 'badge-yellow' : 'badge-green'

  return (
    <UserLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>👋 Welcome, {profile.username}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: autoOn ? '#4ade80' : '#94a3b8' }}>
            {autoOn ? '🟢 Auto-monitoring ON' : '⚪ Auto-monitoring OFF'}
          </span>
          <button className={`btn-sm ${autoOn ? 'btn-danger' : 'btn-success'}`} onClick={() => setAutoOn(v => !v)}>
            {autoOn ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-val" style={{ fontSize: '1rem', color: profile.status === 'active' ? '#4ade80' : '#f87171' }}>
            {profile.status}
          </div>
          <div className="stat-label">Account Status</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛡️</div>
          <div className="stat-val" style={{ color: risk ? riskColor(risk.risk_level) : '#60a5fa' }}>
            {risk?.risk_score ?? '—'}
          </div>
          <div className="stat-label">Risk Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-val" style={{ fontSize: '1rem', color: risk ? riskColor(risk.risk_level) : '#94a3b8' }}>
            {risk?.risk_level ?? 'Scanning...'}
          </div>
          <div className="stat-label">Risk Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-val" style={{ fontSize: '1rem' }}>
            {risk?.action ?? 'Monitoring'}
          </div>
          <div className="stat-label">Access Status</div>
        </div>
      </div>

      {/* Live Risk Monitor */}
      {risk && (
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Live Risk Monitor</h3>
            <span className={`badge ${riskBadge(risk.risk_level)}`}>{risk.risk_level} Risk</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Risk Score</span>
            <span style={{ fontWeight: 700, color: riskColor(risk.risk_level) }}>{risk.risk_score}/100</span>
          </div>
          <div className="risk-meter">
            <div className={`risk-fill risk-${risk.risk_level.toLowerCase()}`} style={{ width: `${risk.risk_score}%` }} />
          </div>
          <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#64748b' }}>
            Auto-updates every 10s
          </div>
          {risk.risk_level === 'High' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.88rem' }}>
              🚨 High risk detected! Account blocked. Redirecting...
            </div>
          )}
        </div>
      )}

      {/* Behavior Capture Details */}
      {lastCapture && (
        <div className="section-card">
          <h3>📡 Last Behavior Capture</h3>
          <table className="data-table">
            <thead>
              <tr><th>Field</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td style={{ color: '#94a3b8' }}>User ID</td><td>{lastCapture.userId}</td></tr>
              <tr><td style={{ color: '#94a3b8' }}>Location</td><td>{lastCapture.location}</td></tr>
              <tr><td style={{ color: '#94a3b8' }}>Device Type</td><td>{lastCapture.device}</td></tr>
              <tr><td style={{ color: '#94a3b8' }}>Browser</td><td>{lastCapture.browser}</td></tr>
              <tr><td style={{ color: '#94a3b8' }}>Access Speed</td><td>{lastCapture.speed} req/s</td></tr>
              <tr><td style={{ color: '#94a3b8' }}>Timestamp</td><td>{lastCapture.timestamp}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#475569' }}>
            Every login interaction is logged for AI analysis · Updates every 10s
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="section-card">
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-sm btn-primary-sm" onClick={() => nav('/risk')}>📊 Risk Analysis</button>
          <button className="btn-sm btn-primary-sm" onClick={() => nav('/profile')}>👤 My Profile</button>
          <button className="btn-sm btn-primary-sm" onClick={() => nav('/change-password')}>🔑 Change Password</button>
        </div>
      </div>
    </UserLayout>
  )
}
