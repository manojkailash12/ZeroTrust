import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API } from '../../api'
import AdminLayout from '../../components/AdminLayout'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const nav = useNavigate()
  const [users, setUsers] = useState([])
  const [alerts, setAlerts] = useState([])
  const [reports, setReports] = useState([])
  const [sessions, setSessions] = useState([])

  const load = () => {
    // Fetch each independently so one failure doesn't wipe all data
    axios.get(`${API}/admin/users`).then(r => setUsers(r.data)).catch(() => {})
    axios.get(`${API}/admin/notifications`).then(r => setAlerts(r.data)).catch(() => {})
    axios.get(`${API}/admin/risk-reports`).then(r => setReports(r.data)).catch(() => {})
    axios.get(`${API}/admin/live-sessions`).then(r => setSessions(r.data)).catch(() => {})
  }

  useEffect(() => {
    load()
    // Auto-refresh every 10 seconds
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const blocked = users.filter(u => u.status === 'blocked').length
  const active  = users.filter(u => u.status === 'active').length
  const chartData = reports.slice().reverse().slice(-20).map((r, i) => ({ i: i + 1, score: r.risk_score, user: r.username }))

  const riskColor = l => l === 'High' ? '#ef4444' : l === 'Medium' ? '#f59e0b' : '#22c55e'
  const riskBadge = l => l === 'High' ? 'badge-red' : l === 'Medium' ? 'badge-yellow' : 'badge-green'

  return (
    <AdminLayout>
      <h1 className="page-title">🛡️ Security Operations Center</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-val">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-val" style={{ color: '#4ade80' }}>{active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-val" style={{ color: '#f87171' }}>{blocked}</div>
          <div className="stat-label">Blocked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-val" style={{ color: alerts.length > 0 ? '#f87171' : '#4ade80' }}>{alerts.length}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📡</div>
          <div className="stat-val" style={{ color: '#60a5fa' }}>{sessions.length}</div>
          <div className="stat-label">Live Sessions</div>
        </div>
      </div>

      {/* Live User Sessions */}
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>📡 Live User Monitoring</h3>
          <span style={{ fontSize: '0.78rem', color: '#4ade80' }}>● Auto-refreshing every 10s</span>
        </div>
        {sessions.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No active user sessions yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Device / Browser</th>
                <th>Location</th>
                <th>IP</th>
                <th>Speed</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={i}>
                  <td><b>{s.username}</b></td>
                  <td style={{ fontSize: '0.8rem' }}>{s.device}{s.browser ? ` / ${s.browser}` : ''}</td>
                  <td>{s.location}</td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.ip}</td>
                  <td>{s.access_speed}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="risk-meter" style={{ width: 60 }}>
                        <div className={`risk-fill risk-${s.risk_level.toLowerCase()}`} style={{ width: `${s.risk_score}%` }} />
                      </div>
                      <span style={{ color: riskColor(s.risk_level), fontWeight: 700, fontSize: '0.85rem' }}>{s.risk_score}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'blocked' ? 'badge-red' : 'badge-yellow'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {s.last_seen ? new Date(s.last_seen).toLocaleTimeString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Risk Chart */}
      {chartData.length > 0 && (
        <div className="section-card">
          <h3>📈 Risk Score Trend (last 20 events)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="i" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v, n, p) => [v, p.payload.user]} />
              <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="section-card">
          <h3>🚨 Recent Alerts</h3>
          <table className="data-table">
            <thead><tr><th>User</th><th>Message</th><th>Unblock Request</th><th>Time</th></tr></thead>
            <tbody>
              {alerts.slice(0, 5).map((a, i) => (
                <tr key={i}>
                  <td><b>{a.username}</b></td>
                  <td>{a.message}</td>
                  <td>{a.unblock_requested ? <span className="badge badge-yellow">Requested</span> : '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {new Date(a.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-sm btn-primary-sm" style={{ marginTop: 12 }} onClick={() => nav('/admin/notifications')}>
            View All Alerts →
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
