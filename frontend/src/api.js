import axios from 'axios'

export const API = import.meta.env.VITE_API_URL || ''

// Warm up the backend immediately on app load (prevents cold-start delay on first real request)
axios.get(`${API}/ping`).catch(() => {})

// Global interceptor — attaches token to every request automatically
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// If any request gets 401 (token expired/invalid, outside of login), clear session and redirect
axios.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    const isLoginRequest = url.includes('/login')
    const isRegisterRequest = url.includes('/register')
    // Only auto-logout on 401 (invalid/expired token), NOT on 403 (blocked account)
    // Let individual pages handle 403 so blocked users can reach /request-unblock
    if (err.response?.status === 401 && !isLoginRequest && !isRegisterRequest) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

export function getSession() {
  return {
    token:    localStorage.getItem('token')    || '',
    userId:   localStorage.getItem('userId')   || '',
    role:     localStorage.getItem('role')     || '',
    username: localStorage.getItem('username') || '',
    email:    localStorage.getItem('email')    || '',
    mobile:   localStorage.getItem('mobile')   || '',
    status:   localStorage.getItem('status')   || 'active',
  }
}

export default axios
