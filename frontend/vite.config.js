import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Only proxy requests that come from fetch/XHR (have Accept: application/json)
// Browser navigations (typing URL) will be served by Vite → React router
const apiProxy = (path) => ({
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  bypass(req) {
    // If it's a browser navigation (not an API call), let Vite handle it
    const accept = req.headers['accept'] || ''
    if (accept.includes('text/html')) return req.url
    return null
  }
})

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login':                    apiProxy('/login'),
      '/register':                 apiProxy('/register'),
      '/verify-user':              apiProxy('/verify-user'),
      '/forgot-password':          apiProxy('/forgot-password'),
      '/reset-password':           apiProxy('/reset-password'),
      '/log-behavior':             apiProxy('/log-behavior'),
      '/analyze-risk':             apiProxy('/analyze-risk'),
      '/request-unblock':          apiProxy('/request-unblock'),
      '/change-password':          apiProxy('/change-password'),
      '/profile':                  apiProxy('/profile'),
      '/db-check':                 apiProxy('/db-check'),
      '/verify-unblock-key':       apiProxy('/verify-unblock-key'),
      '/admin/users':              apiProxy('/admin/users'),
      '/admin/notifications':      apiProxy('/admin/notifications'),
      '/admin/risk-reports':       apiProxy('/admin/risk-reports'),
      '/admin/unblock':            apiProxy('/admin/unblock'),
      '/admin/live-sessions':      apiProxy('/admin/live-sessions'),
      '/admin/send-unblock-key':   apiProxy('/admin/send-unblock-key'),
      '/admin/create-admin':       apiProxy('/admin/create-admin'),
    }
  }
})
