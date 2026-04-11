import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/layout.css'

const adminNav = [
  { path: '/admin', label: '🏠 Dashboard' },
  { path: '/admin/users', label: '👥 Users' },
  { path: '/admin/notifications', label: '🚨 Alerts' },
  { path: '/admin/risk-reports', label: '📊 Risk Reports' },
  { path: '/admin/profile', label: '👤 My Profile' },
]

export default function AdminLayout({ children }) {
  const nav = useNavigate()
  const loc = useLocation()
  const username = localStorage.getItem('username') || 'Admin'

  const logout = () => {
    localStorage.clear()
    nav('/login')
  }

  return (
    <div className="layout-root">
      {/* Sidebar */}
      <aside className="sidebar admin-sidebar">
        <div className="sidebar-brand">🛡️ Admin SOC</div>
        <nav className="sidebar-nav">
          {adminNav.map(n => (
            <div
              key={n.path}
              className={`nav-item ${loc.pathname === n.path ? 'active' : ''}`}
              onClick={() => nav(n.path)}
            >
              {n.label}
            </div>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout}>⏻ Logout</button>
      </aside>

      {/* Main area */}
      <div className="layout-body">
        {/* Top navbar */}
        <header className="topbar admin-topbar">
          <div className="topbar-left">
            <span className="topbar-page">{adminNav.find(n => n.path === loc.pathname)?.label || 'Dashboard'}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-avatar admin-avatar">{username[0]?.toUpperCase()}</div>
            <span className="topbar-username">{username}</span>
            <button className="topbar-logout" onClick={logout}>⏻ Logout</button>
          </div>
        </header>

        <main className="layout-main">{children}</main>
      </div>
    </div>
  )
}
