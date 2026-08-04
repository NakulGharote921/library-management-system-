import api from './api.js'

function backendOrigin() {
  const env = import.meta.env.VITE_API_BASE_URL?.trim()
  if (env && !env.startsWith('/')) return env.replace(/\/api\/?$/, '').replace(/\/$/, '')
  return 'http://localhost:8081'
}

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  googleLoginUrl: () => `${backendOrigin()}/oauth2/authorization/google`,
}
