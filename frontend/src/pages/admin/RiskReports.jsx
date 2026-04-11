import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, authHeaders } from '../../api'
import AdminLayout from '../../components/AdminLayout'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

export default function RiskReports() {
  const nav = useNavigate()
  const [reports, setReports] = useState([])

  const load = () => {
    axios.get(`${API}/admin/risk-reports`, authHeaders())
      .then(r => setReports(r.data))
      .catch(() => {})
  }

  useEffect(() => {
    load()
    // Auto-refresh every 10 seconds to pick up new risk events
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const chartData = reports.slice().reverse().slice(-30).map((r, i) => ({
    i: i + 1,
    score: r.risk_score,
    user: r.username,
    level: r.risk_level
  }))

  const barColor = level => level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e'

  const levelCounts = reports.reduce((acc, r) => {
    acc[r.risk_level] = (acc[r.risk_level] || 0) + 1
    return acc
  }, {})

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 className="page-title" style={{ margin: 0 }}>📊 Risk Reports</h1>
        <span style={{ fontSize: '0.78rem', color: '#4ade80' }}>● Auto-refreshing every 10s</span>
      </div>

      <div className="stats-grid">
        {['High', 'Medium', 'Low'].map(level => (
          <div className="stat-card" key={level}>
            <div className="stat-icon">{level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢'}</div>
            <div className="stat-val" style={{ color: barColor(level) }}>{levelCounts[level] || 0}</div>
            <div className="stat-label">{level} Risk Events</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-val">{reports.length}</div>
          <div className="stat-label">Total Events</div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="section-card" style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
          <p>No risk events yet. Risk data appears here once users start sessions.</p>
        </div>
      ) : (
        <>
          {chartData.length > 0 && (
            <>
              <div className="section-card">
                <h3>Risk Score Trend (last 30 events)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="i" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v, n, p) => [v, p.payload.user]} />
                    <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="section-card">
                <h3>Risk Score Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="i" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v, n, p) => [v, p.payload.user]} />
                    <Bar dataKey="score">
                      {chartData.map((entry, i) => <Cell key={i} fill={barColor(entry.level)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          <div className="section-card">
            <h3>All Risk Events</h3>
            <table className="data-table">
              <thead><tr><th>User</th><th>Risk Level</th><th>Score</th><th>Time</th></tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.username}</b></td>
                    <td><span className={`badge ${r.risk_level === 'High' ? 'badge-red' : r.risk_level === 'Medium' ? 'badge-yellow' : 'badge-green'}`}>{r.risk_level}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="risk-meter" style={{ width: 80 }}>
                          <div className={`risk-fill risk-${r.risk_level.toLowerCase()}`} style={{ width: `${r.risk_score}%` }} />
                        </div>
                        <span style={{ fontSize: '0.85rem' }}>{r.risk_score}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(r.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
