import { useEffect, useSyncExternalStore } from 'react'
import { ensureBackendReady, getBackendSnapshot, subscribeBackend } from '../api/backendConnection'

export default function BackendConnection({ children }) {
  const connection = useSyncExternalStore(subscribeBackend, getBackendSnapshot)
  useEffect(() => {
    const connect = () => { ensureBackendReady().catch(() => {}) }
    const visible = () => { if (document.visibilityState === 'visible') connect() }
    connect()
    window.addEventListener('focus', connect)
    window.addEventListener('online', connect)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', connect)
      window.removeEventListener('online', connect)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])
  return <>
    {connection.hasConnected && <div hidden={connection.phase !== 'ready'}>{children}</div>}
    {connection.phase !== 'ready' && <main className="connection-page"><section className="card connection-card" aria-labelledby="connection-title">
      <div className="auth-brand">🐟 Fish Farm</div>
      <h1 id="connection-title">{connection.phase === 'error' ? 'Unable to connect' : 'Connecting to your farm…'}</h1>
      {connection.phase === 'error' ? <><p role="alert">{connection.message}</p><button className="btn btn-primary" onClick={() => ensureBackendReady({ force: true }).catch(() => {})}>Try again</button></> : <div role="status"><div className="spinner" /><p>The server may be starting. This can take a few minutes on our testing plan. We will continue automatically when it is ready.</p><p className="page-desc">You do not need to open another link or keep refreshing.</p></div>}
    </section></main>}
  </>
}
