import { Routes, Route, Navigate } from 'react-router-dom'

// Public pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Verify from './pages/Verify'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import RequestUnblock from './pages/RequestUnblock'
import ChangePassword from './pages/ChangePassword'

// User pages
import UserDashboard from './pages/user/Dashboard'
import Behavior from './pages/user/Behavior'
import RiskAnalysis from './pages/user/RiskAnalysis'
import UserProfile from './pages/user/Profile'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminNotifications from './pages/admin/Notifications'
import RiskReports from './pages/admin/RiskReports'
import AdminProfile from './pages/admin/Profile'

const isAuth = () => !!localStorage.getItem('token')
const isAdmin = () => localStorage.getItem('role') === 'admin'

function PrivateRoute({ children }) {
  return isAuth() ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  return isAuth() && isAdmin() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<Navigate to="/forgot" replace />} />
      <Route path="/request-unblock" element={<RequestUnblock />} />

      {/* Auth required */}
      <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

      {/* User */}
      <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
      <Route path="/behavior" element={<PrivateRoute><Behavior /></PrivateRoute>} />
      <Route path="/risk" element={<PrivateRoute><RiskAnalysis /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
      <Route path="/admin/risk-reports" element={<AdminRoute><RiskReports /></AdminRoute>} />
      <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
