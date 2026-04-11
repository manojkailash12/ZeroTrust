import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/layout.css'

const userNav = [
  { path: '/dashboard', label: '🏠 Dashboard' },
  { path: '/risk', label: '⚠️ Risk Analysis' },
  { path: '/profile', label: '👤 My Profile' },
  { path: '/change-password', label: '🔑 Change Password' },
  { path: '/request-unblock', label: '🔓 Request Unblock' },
]

export default function UserLayout({ children }) {
  const nav = useNavigate()
  const loc = useLocation()
  const username = localStorage.getItem('username') || 'User'

  const logout = () => {
    localStorage.clear()
    nav('/login')
  }

  return (
    <div className="layout-root">
      {/* Sidebar */}
      <aside className="sidebar user-sidebar">
        <div className="sidebar-brand">🔒 ZeroTrust</div>
        <nav className="sidebar-nav">
          {userNav.map(n => (
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
        <header className="topbar user-topbar">
          <div className="topbar-left">
            <span className="topbar-page">{userNav.find(n => n.path === loc.pathname)?.label || 'Dashboard'}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-avatar user-avatar">{username[0]?.toUpperCase()}</div>
            <span className="topbar-username">{username}</span>
            <button className="topbar-logout" onClick={logout}>⏻ Logout</button>
          </div>
        </header>

        <main className="layout-main">{children}</main>
      </div>
    </div>
  )
}
