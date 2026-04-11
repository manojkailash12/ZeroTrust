import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, authHeaders, getSession } from '../../api'
import UserLayout from '../../components/UserLayout'

export default function UserProfile() {
  const nav = useNavigate()
  const session = getSession()

  // Render instantly from cached session
  const [profile, setProfile] = useState({
    username: session.username,
    email:    session.email,
    mobile:   session.mobile,
    role:     session.role || 'user',
    status:   session.status || 'active',
  })
  const [edit, setEdit] = useState({ email: session.email, mobile: session.mobile })
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState('')

  // Silently refresh from MongoDB
  useEffect(() => {
    axios.get(`${API}/profile`, authHeaders())
      .then(r => {
        setProfile(r.data)
        setEdit({ email: r.data.email, mobile: r.data.mobile })
        localStorage.setItem('email',  r.data.email)
        localStorage.setItem('mobile', r.data.mobile)
        localStorage.setItem('status', r.data.status)
      })
      .catch(() => nav('/login'))
  }, [])

  const save = async () => {
    try {
      await axios.put(`${API}/profile`, edit, authHeaders())
      setProfile(p => ({ ...p, ...edit }))
      localStorage.setItem('email',  edit.email)
      localStorage.setItem('mobile', edit.mobile)
      setEditing(false)
      setStatus('✅ Profile updated')
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.detail || 'Update failed'}`)
    }
  }

  const statusBadge = s => ({ active: 'badge-green', blocked: 'badge-red', pending: 'badge-yellow' }[s] || 'badge-gray')

  return (
    <UserLayout>
      <h1 className="page-title">👤 My Profile</h1>

      <div className="section-card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: 'white', fontWeight: 800 }}>
            {profile.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{profile.username}</div>
            <span className={`badge ${statusBadge(profile.status)}`}>{profile.status}</span>
            <span className="badge badge-blue" style={{ marginLeft: 6 }}>{profile.role}</span>
          </div>
        </div>

        {!editing ? (
          <>
            <div style={{ display: 'grid', gap: 12 }}>
              {[['Username', profile.username], ['Email', profile.email], ['Mobile', profile.mobile], ['Role', profile.role], ['Status', profile.status]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{k}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-sm btn-primary-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
              <button className="btn-sm btn-primary-sm" onClick={() => nav('/change-password')}>🔑 Change Password</button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" value={edit.email} onChange={e => setEdit(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input className="form-input" value={edit.mobile} onChange={e => setEdit(f => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-sm btn-success" onClick={save}>💾 Save</button>
              <button className="btn-sm btn-danger" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        )}
        {status && <p className="status-msg">{status}</p>}
      </div>
    </UserLayout>
  )
}
