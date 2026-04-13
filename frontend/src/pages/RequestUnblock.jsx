import { useNavigate } from 'react-router-dom'
import '../styles/auth.css'

// This page is no longer the primary unblock flow.
// Unblocking now happens directly on the Login page when account is blocked.
// This page just redirects users to login.
export default function RequestUnblock() {
  const nav = useNavigate()
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">🔐</div>
        <h2 style={{ color: '#ef4444' }}>Account Blocked</h2>
        <p className="auth-sub">
          Please go to the login page, enter your credentials, and you'll be prompted to enter your unblock key.
        </p>
        <button className="btn-auth" onClick={() => nav('/login')}>Go to Login</button>
      </div>
    </div>
  )
}
