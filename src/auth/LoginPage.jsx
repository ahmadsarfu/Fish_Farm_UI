import { useEffect, useState } from 'react'
import { request } from '../api'
import { useAuth } from './context'

export default function LoginPage() {
  const { setUser } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', displayName: '', farmName: '', claimExisting: false, setupToken: '' })
  const [legacyWaiting, setLegacyWaiting] = useState(false)
  const [claimAvailable, setClaimAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { request('/api/auth/setup-status').then(value => { setClaimAvailable(value.legacyClaimAvailable); setLegacyWaiting(value.legacyDataWaiting) }).catch(() => {}) }, [])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const user = await request(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) })
      setForm(current => ({ ...current, password: '', setupToken: '' })); setUser(user)
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-intro"><div className="auth-brand">🐟 Fish Farm</div><h1>Your farm. Every fish. Every rupee.</h1><p>Keep feeding, fish transfers and batch costs together.</p></div>
    <form className="auth-card" onSubmit={submit}><h2>{mode === 'login' ? 'Welcome back' : 'Set up your farm'}</h2><p className="page-desc">{mode === 'login' ? 'Log in with your farm account.' : 'Create an owner account. Invite your team after setup.'}</p>
      {mode === 'register' && legacyWaiting && <div className="alert alert-info">{claimAvailable ? 'Existing farm data is preserved. Select “Use my existing farm data” and enter your setup code to access it. An unchecked option creates a separate empty farm.' : 'Existing farm data is waiting for owner setup. Start the API with its setup code before claiming it. A new farm account will be separate and empty.'}</div>}
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <fieldset className="auth-fields" disabled={busy}>
        {mode === 'register' && <><label className="form-group">Your name<input required maxLength={120} autoComplete="name" value={form.displayName} onChange={event => change('displayName', event.target.value)} /></label><label className="form-group">Farm name<input required maxLength={120} value={form.farmName} onChange={event => change('farmName', event.target.value)} /></label></>}
        <label className="form-group">Username<input required minLength={3} maxLength={120} autoComplete="username" value={form.username} onChange={event => change('username', event.target.value)} /></label>
        <label className="form-group">Password<input required type="password" minLength={mode === 'register' ? 10 : 1} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={event => change('password', event.target.value)} /></label>
        {mode === 'register' && claimAvailable && <><label className="auth-check"><input type="checkbox" checked={form.claimExisting} onChange={event => change('claimExisting', event.target.checked)} />Use my existing farm data</label>{form.claimExisting && <label className="form-group">One-time setup code<input required type="password" autoComplete="off" value={form.setupToken} onChange={event => change('setupToken', event.target.value)} /><span className="page-desc">Use the code configured on your server. Existing records stay in this farm.</span></label>}</>}
        <button className="btn btn-primary auth-submit" type="submit">{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create owner account'}</button>
        <button className="btn btn-ghost auth-submit" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); change('password', '') }}>{mode === 'login' ? 'Create a farm account' : 'Back to login'}</button>
      </fieldset>
    </form></main>
}
