import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { API, authHeaders } from '../../api'
import AdminLayout from '../../components/AdminLayout'

export default function AdminUsers() {
  const nav = useNavigate()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({ email: '', mobile: '' })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => axios.get(`${API}/admin/users`, authHeaders()).then(r => setUsers(r.data)).catch(() => nav('/login'))
  useEffect(() => { load() }, [])

  const sendKey = async (username) => {
    setSending(username)
    try {
      await axios.post(`${API}/admin/send-unblock-key/${username}`, {}, authHeaders())
      setStatus(`✅ Unblock key sent to ${username}'s email`)
    } catch {
      setStatus('❌ Failed to send key')
    } finally {
      setSending('')
    }
  }

  const openEdit = (u) => {
    setSelected(u)
    setEditForm({ email: u.email, mobile: u.mobile })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await axios.put(`${API}/admin/users/${selected.username}`, editForm, authHeaders())
      setStatus('✅ User updated')
      setSelected(null)
      load()
    } catch {
      setStatus('❌ Update failed')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = s => ({ active: 'badge-green', blocked: 'badge-red', pending: 'badge-yellow' }[s] || 'badge-gray')

  return (
    <AdminLayout>
      <h1 className="page-title">👥 User Management</h1>

      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>All Users ({filtered.length})</h3>
          <input
            className="form-input"
            style={{ width: 240 }}
            placeholder="🔍 Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {status && <p className="status-msg">{status}</p>}

        <table className="data-table">
          <thead>
            <tr><th>Username</th><th>Email</th><th>Mobile</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={i}>
                <td><b>{u.username}</b></td>
                <td>{u.email}</td>
                <td>{u.mobile}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-gray'}`}>{u.role}</span></td>
                <td><span className={`badge ${statusBadge(u.status)}`}>{u.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-sm btn-primary-sm" onClick={() => openEdit(u)}>✏️ Edit</button>
                  {u.status === 'blocked' && (
                    <button className="btn-sm btn-warning" onClick={() => sendKey(u.username)} disabled={sending === u.username}>
                      {sending === u.username ? '⏳' : '📧 Send Key'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 28, width: 380, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 20px', color: '#f1f5f9' }}>Edit: {selected.username}</h3>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input className="form-input" value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-sm btn-success" onClick={saveEdit} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save'}
              </button>
              <button className="btn-sm btn-danger" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
