import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, authHeaders } from '../../api'
import UserLayout from '../../components/UserLayout'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function RiskAnalysis() {
  const nav = useNavigate()
  const userId = localStorage.getItem('userId')
  const [risk, setRisk] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const intervalRef = useRef(null)

  const analyze = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/analyze-risk/${userId}`, {}, authHeaders())
      setRisk(res.data)
      setHistory(h => [...h, { score: res.data.risk_score, time: new Date().toLocaleTimeString() }])
      if (res.data.risk_level === 'High') {
        setStatus('🚨 HIGH RISK – Account blocked. Redirecting...')
        clearInterval(intervalRef.current)
        setTimeout(() => nav('/request-unblock'), 2500)
      }
    } catch {
      nav('/login')
    } finally {
      setLoading(false)
    }
  }

  // Auto-run on mount and every 30 seconds
  useEffect(() => {
    analyze()
    intervalRef.current = setInterval(analyze, 10000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const riskColor = r => r === 'High' ? '#ef4444' : r === 'Medium' ? '#f59e0b' : '#22c55e'

  return (
    <UserLayout>
      <h1 className="page-title">⚠️ Risk Analysis</h1>

      <div className="section-card">
        <h3>Run Risk Analysis</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 16 }}>
          The AI model analyzes your recent behavior logs using Isolation Forest and TF-IDF similarity to compute a risk score.
        </p>
        <button className="btn-sm btn-primary-sm" onClick={analyze} disabled={loading}>
          {loading ? '⏳ Analyzing...' : '🔍 Analyze Now'}
        </button>
        {status && <p className="status-msg" style={{ color: '#f87171' }}>{status}</p>}
      </div>

      {risk && (
        <div className="section-card">
          <h3>Current Risk Assessment</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8' }}>Risk Score</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: riskColor(risk.risk_level) }}>{risk.risk_score}/100</span>
              </div>
              <div className="risk-meter">
                <div className={`risk-fill risk-${risk.risk_level.toLowerCase()}`} style={{ width: `${risk.risk_score}%` }} />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: riskColor(risk.risk_level) }}>{risk.risk_level}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Risk Level</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>{risk.action}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Action</div>
            </div>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="section-card">
          <h3>Risk Score History (this session)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </UserLayout>
  )
}
