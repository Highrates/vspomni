import axios from 'axios'

/**
 * Legacy axios helper — предпочтите `@/api/apiClient`.
 * JWT в браузере: httpOnly cookie через same-origin `/api/v1` BFF (не localStorage).
 */
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

export default api
