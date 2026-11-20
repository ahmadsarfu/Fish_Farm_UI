import { API_BASE } from './config'

const FRESH_FOR = 60_000
const STARTUP_LIMIT = 240_000
const PROBE_TIMEOUT = 15_000
const RETRY_DELAY = 3_000
let lastReady = 0
let epoch = 0
let pending = null
let snapshot = { phase: 'checking', hasConnected: false, message: '' }
const listeners = new Set()
export const getBackendSnapshot = () => snapshot
export const subscribeBackend = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export const backendEpoch = () => epoch
export function invalidateBackend() { lastReady = 0 }
function publish(phase, message = '') {
  snapshot = { phase, message, hasConnected: snapshot.hasConnected || phase === 'ready' }
  listeners.forEach(listener => listener())
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
export function isTemporaryFailure(response) { return [408, 425, 500, 502, 503, 504].includes(response.status) }

// Probe only a read endpoint. Never replay a login, feeding tick, expense or other write.
export function ensureBackendReady({ force = false } = {}) {
  if (pending) return pending
  if (!force && lastReady && Date.now() - lastReady < FRESH_FOR) return Promise.resolve()
  pending = probe().finally(() => { pending = null })
  return pending
}
async function probe() {
  const wasConnected = snapshot.hasConnected
  publish('checking')
  const deadline = Date.now() + STARTUP_LIMIT
  try {
    while (Date.now() < deadline) {
      if (!navigator.onLine) throw new Error('You appear to be offline. Check your connection, then try again.')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), Math.min(PROBE_TIMEOUT, deadline - Date.now()))
      let permanentError = null
      try {
        const response = await fetch(`${API_BASE}/api/auth/setup-status`, { credentials: 'include', cache: 'no-store', signal: controller.signal })
        if (response.ok) {
          // Render may return an HTML wake-up page with HTTP 200; it is not API readiness.
          const body = await response.json()
          if (body && (typeof body.legacyDataWaiting === 'boolean' || typeof body.publicRegistrationEnabled === 'boolean')) {
            lastReady = Date.now(); epoch += 1; publish('ready')
            if (wasConnected) window.dispatchEvent(new Event('farm-backend-ready'))
            return
          }
        } else if (!isTemporaryFailure(response)) {
          permanentError = new Error(`Unable to connect to the server (${response.status}). Please try again or contact support.`)
        }
      } catch { /* Network failures, timeouts and wake-up HTML are retried within the startup limit. */ }
      finally { clearTimeout(timeout) }
      if (permanentError) throw permanentError
      const remaining = deadline - Date.now()
      if (remaining > 0) await pause(Math.min(RETRY_DELAY, remaining))
    }
    throw new Error('The server is taking longer than expected. Please try again. If this continues, contact support.')
  } catch (error) {
    lastReady = 0; publish('error', error.message); throw error
  }
}

export async function readFromBackend(path, options = {}) {
  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) throw new Error('Only read requests may be retried')
  await ensureBackendReady()
  let response
  try { response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', cache: 'no-store' }) }
  catch (error) {
    if (options.signal?.aborted) throw error
    await ensureBackendReady({ force: true })
    return fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', cache: 'no-store' })
  }
  if (isTemporaryFailure(response)) {
    await ensureBackendReady({ force: true })
    return fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', cache: 'no-store' })
  }
  return response
}
