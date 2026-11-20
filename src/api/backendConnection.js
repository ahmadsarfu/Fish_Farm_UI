import { API_BASE } from './config'

const FRESH_FOR = 60_000
const STARTUP_LIMIT = 240_000
// Keep the initial request connected long enough for the measured ~150s JVM
// startup plus host allocation. The overall attempt is still capped at 4 minutes.
const PROBE_TIMEOUT = 210_000
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
  let lastFailure = 'NO_RESPONSE'
  try {
    while (Date.now() < deadline) {
      if (!navigator.onLine) throw new Error('You appear to be offline. Check your connection, then try again.')
      const controller = new AbortController()
      let timeout
      let timedOut = false
      const expired = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          timedOut = true
          controller.abort()
          reject(new Error('Readiness request timed out'))
        }, Math.min(PROBE_TIMEOUT, deadline - Date.now()))
      })
      let permanentError = null
      try {
        // Explicitly bound both the response and body read. Some mobile/service-worker
        // fetches may not settle promptly when their AbortSignal is cancelled.
        const operation = fetch(`${API_BASE}/api/auth/setup-status`, { credentials: 'include', cache: 'no-store', signal: controller.signal })
          .then(async response => ({ response, body: response.ok ? await response.json().catch(() => null) : null }))
        const { response, body } = await Promise.race([operation, expired])
        lastFailure = response.ok ? 'NON_API_RESPONSE' : `HTTP_${response.status}`
        if (response.ok) {
          // Render may return an HTML wake-up page with HTTP 200; it is not API readiness.
          if (body && (typeof body.legacyDataWaiting === 'boolean' || typeof body.publicRegistrationEnabled === 'boolean')) {
            lastReady = Date.now(); epoch += 1; publish('ready')
            if (wasConnected) window.dispatchEvent(new Event('farm-backend-ready'))
            return
          }
        } else if (!isTemporaryFailure(response)) {
          permanentError = new Error(`Unable to connect to the server (${response.status}). Please try again or contact support.`)
        }
      } catch { lastFailure = timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR' }
      finally { clearTimeout(timeout) }
      if (permanentError) throw permanentError
      const remaining = deadline - Date.now()
      if (remaining > 0) await pause(Math.min(RETRY_DELAY, remaining))
    }
    throw new Error(`The server is taking longer than expected. Please try again. If this continues, contact support. Reference: ${lastFailure}`)
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
