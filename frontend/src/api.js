import axios from 'axios'

export const API = import.meta.env.VITE_API_URL || ''

// Global interceptor — attaches token to every request automatically
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// If any request gets 401 (outside of login), clear session and redirect to login
axios.interceptors.response.use(
  res => res,
  err => {
    const isLoginRequest = err.config?.url?.includes('/login')
    if (err.response?.status === 401 && !isLoginRequest) {
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
