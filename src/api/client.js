import { API_BASE } from './config'
import { backendEpoch, ensureBackendReady, invalidateBackend, isTemporaryFailure, readFromBackend } from './backendConnection'
export { API_BASE } from './config'
let csrf = null
let csrfEpoch = 0
export function clearSecurityToken() { csrf = null }
export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  await ensureBackendReady()
  if (csrfEpoch !== backendEpoch()) { clearSecurityToken(); csrfEpoch = backendEpoch() }
  if (!['GET', 'HEAD'].includes(method) && !csrf) {
    const response = await readFromBackend('/api/auth/csrf')
    if (!response.ok) { if (response.status === 401) window.dispatchEvent(new Event('farm-session-expired')); throw new Error('Unable to start a secure session. Refresh and try again.') }
    csrf = (await response.json()).token
  }
  const readOnly = ['GET', 'HEAD'].includes(method)
  const init = {
    ...options, method, credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(!['GET', 'HEAD'].includes(method) ? { 'X-XSRF-TOKEN': csrf } : {}), ...options.headers },
  }
  let response
  try { response = readOnly ? await readFromBackend(path, init) : await fetch(`${API_BASE}${path}`, init) }
  catch (error) {
    if (readOnly || options.signal?.aborted) throw error
    clearSecurityToken(); invalidateBackend()
    throw new Error('The connection was interrupted. Your request was not automatically repeated. Check its result before trying again.', { cause: error })
  }
  if (!readOnly && isTemporaryFailure(response)) {
    clearSecurityToken(); invalidateBackend()
    throw new Error('The server could not confirm your request. It was not automatically repeated. Check its result before trying again.')
  }
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
