export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
let csrf = null
export function clearSecurityToken() { csrf = null }
export async function request(path, options = {}) {
  const method = options.method || 'GET'
  if (!['GET', 'HEAD'].includes(method) && !csrf) {
    const response = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include', cache: 'no-store' })
    if (!response.ok) { if (response.status === 401) window.dispatchEvent(new Event('farm-session-expired')); throw new Error('Unable to start a secure session. Refresh and try again.') }
    csrf = (await response.json()).token
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options, credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(!['GET', 'HEAD'].includes(method) ? { 'X-XSRF-TOKEN': csrf } : {}), ...options.headers },
  })
  if (['/api/auth/login', '/api/auth/register', '/api/auth/select-farm', '/api/auth/logout', '/api/auth/password', '/api/auth/activate'].includes(path)) clearSecurityToken()
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (response.status === 401 && !['/api/auth/login', '/api/auth/register'].includes(path)) window.dispatchEvent(new Event('farm-session-expired'))
    throw new Error(error.message || error.error || `Request failed (${response.status})`)
  }
  if (response.status === 204) return null
  const raw = await response.text()
  return raw ? JSON.parse(raw) : null
}
