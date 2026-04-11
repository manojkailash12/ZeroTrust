import { useNavigate } from 'react-router-dom'
import '../styles/home.css'

export default function Home() {
  const nav = useNavigate()
  return (
    <div className="home-root">
      <nav className="home-nav">
        <div className="home-nav-brand">🔒 ZeroTrust AI</div>
        <div className="home-nav-links">
          <button onClick={() => nav('/login')}>Login</button>
          <button className="btn-outline" onClick={() => nav('/register')}>Register</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">AI-Powered Security</span>
          <h1>Zero Trust Cyber<br /><span>Security Platform</span></h1>
          <p>
            Protect your systems with real-time AI-driven anomaly detection,
            continuous risk scoring, and adaptive access control — all in one platform.
          </p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => nav('/register')}>Get Started</button>
            <button className="btn-ghost" onClick={() => nav('/login')}>Sign In →</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="shield-ring">
            <div className="shield-inner">🛡️</div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Why Zero Trust?</h2>
        <div className="features-grid">
          {[
            { icon: '🤖', title: 'AI Anomaly Detection', desc: 'Isolation Forest ML model detects unusual behavior patterns in real time.' },
            { icon: '📊', title: 'Risk Scoring', desc: 'Continuous risk assessment with automated blocking on high-risk events.' },
            { icon: '🔐', title: 'Adaptive Access', desc: 'Never trust, always verify — every request is authenticated and authorized.' },
            { icon: '📧', title: 'Instant Alerts', desc: 'Email notifications for logins, blocks, and security events.' },
            { icon: '👤', title: 'User Management', desc: 'Full admin control over users, profiles, and access policies.' },
            { icon: '📈', title: 'Analytics Dashboard', desc: 'Visual risk analytics and behavior monitoring for administrators.' },
          ].map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <p>© 2026 ZeroTrust AI Security Platform. All rights reserved.</p>
      </footer>
    </div>
  )
}
