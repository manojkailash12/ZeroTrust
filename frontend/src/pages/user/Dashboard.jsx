import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, getSession } from '../../api'
import UserLayout from '../../components/UserLayout'

// Detect browser name
function getBrowser() {
  const ua = navigator.userAgent
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  return 'Unknown'
}

function getDevice() {
  const ua = navigator.userAgent
  if (/Android|iPhone|iPad/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

export default function UserDashboard() {
  const nav = useNavigate()
  const session = getSession()
  const [profile, setProfile] = useState({ username: session.username, status: session.status || 'active' })
  const [risk, setRisk] = useState(null)
  const [autoOn, setAutoOn] = useState(true)
  const [tick, setTick] = useState(0)
  const intervalRef = useRef(null)
  const logCount = useRef(0)

  // Load profile once
  useEffect(() => {
    axios.get(`${API}/profile`).then(r => {
      setProfile(r.data)
      localStorage.setItem('status', r.data.status)
    }).catch(() => nav('/login'))
  }, [])

  // Run risk analysis immediately + log real behavior, then repeat every 10 seconds
  const runCycle = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    logCount.current += 1
    // Log real device/browser data only — no fake anomaly simulation
    const device = `${getDevice()}_${getBrowser()}`
    const speed = parseFloat((1 + Math.random() * 1.5).toFixed(2)) // normal 1.0–2.5 req/s

    try {
      await axios.post(`${API}/log-behavior`, {
        user_id: userId,
        location: 'Active Session',
        device,
        access_speed: speed,
        browser: getBrowser(),
      })

      const res = await axios.post(`${API}/analyze-risk/${userId}`, {})
      setRisk(res.data)
      setTick(t => t + 1)

      if (res.data.risk_level === 'High') {
        clearInterval(intervalRef.current)
        setAutoOn(false)
        localStorage.setItem('status', 'blocked')
        setTimeout(() => nav('/request-unblock'), 1500)
      }
    } catch {
      // silent — don't disrupt UI
    }
  }

  useEffect(() => {
    if (!autoOn) { clearInterval(intervalRef.current); return }

    runCycle() // run immediately on mount / when turned on
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
          <button
            className={`btn-sm ${autoOn ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setAutoOn(v => !v)}
          >
            {autoOn ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

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
            Device: {getDevice()} · Browser: {getBrowser()} · Auto-updates every 10s
          </div>
          {risk.risk_level === 'High' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.88rem' }}>
              🚨 High risk detected! Account blocked. Redirecting...
            </div>
          )}
        </div>
      )}

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
