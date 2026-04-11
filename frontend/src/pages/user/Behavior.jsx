import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, authHeaders } from '../../api'
import UserLayout from '../../components/UserLayout'

const PRESETS = [
  { label: '🟢 Normal – Office', location: 'Hyderabad', device: 'Chrome_Windows', speed: 1.2, type: 'normal' },
  { label: '🟡 Remote – Mobile', location: 'Mumbai', device: 'Safari_iPhone', speed: 2.8, type: 'medium' },
  { label: '🔴 Suspicious – Unknown', location: 'Unknown', device: 'Suspicious_Device', speed: 15, type: 'abnormal' },
]

export default function Behavior() {
  const nav = useNavigate()
  const userId = localStorage.getItem('userId')
  const [custom, setCustom] = useState({ location: '', device: '', speed: '' })
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('')

  const log = async (data) => {
    try {
      await axios.post(`${API}/log-behavior`, { user_id: userId, ...data }, authHeaders())
      const entry = { ...data, time: new Date().toLocaleTimeString() }
      setLogs(l => [entry, ...l.slice(0, 9)])
      setStatus(`✅ Logged: ${data.location} / ${data.device}`)
    } catch {
      setStatus('❌ Session expired')
      nav('/login')
    }
  }

  const logCustom = () => {
    if (!custom.location || !custom.device || !custom.speed) return setStatus('⚠ Fill all fields')
    log({ location: custom.location, device: custom.device, access_speed: parseFloat(custom.speed) })
  }

  return (
    <UserLayout>
      <h1 className="page-title">📡 Behavior Logging</h1>

      <div className="section-card">
        <h3>Quick Log Presets</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              className={`btn-sm ${p.type === 'normal' ? 'btn-success' : p.type === 'abnormal' ? 'btn-danger' : 'btn-primary-sm'}`}
              onClick={() => log({ location: p.location, device: p.device, access_speed: p.speed })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h3>Custom Behavior Log</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Location</label>
            <input className="form-input" placeholder="e.g. Bangalore" value={custom.location} onChange={e => setCustom(c => ({ ...c, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Device</label>
            <input className="form-input" placeholder="e.g. Firefox_Linux" value={custom.device} onChange={e => setCustom(c => ({ ...c, device: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Access Speed (req/s)</label>
            <input className="form-input" type="number" placeholder="e.g. 2.5" value={custom.speed} onChange={e => setCustom(c => ({ ...c, speed: e.target.value }))} />
          </div>
        </div>
        <button className="btn-sm btn-primary-sm" onClick={logCustom}>Log Custom Behavior</button>
        {status && <p className="status-msg">{status}</p>}
      </div>

      {logs.length > 0 && (
        <div className="section-card">
          <h3>Recent Logs (this session)</h3>
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>Location</th><th>Device</th><th>Speed</th></tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i}>
                  <td>{l.time}</td>
                  <td>{l.location}</td>
                  <td>{l.device}</td>
                  <td>{l.access_speed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </UserLayout>
  )
}
