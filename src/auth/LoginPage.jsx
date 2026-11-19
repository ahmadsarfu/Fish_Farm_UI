import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authApi } from '../api/authApi'
import { useAuth } from './context'

export default function LoginPage({ admin = false, legacySetup = false }) {
  const { setUser } = useAuth()
  const [mode, setMode] = useState(legacySetup ? 'register' : 'login')
  const [form, setForm] = useState({ username: '', password: '', displayName: '', farmName: '', mobile: '', email: '', claimExisting: legacySetup, setupToken: '', otp: '' })
  const [legacyWaiting, setLegacyWaiting] = useState(false)
  const [claimAvailable, setClaimAvailable] = useState(false)
  const [publicRegistration, setPublicRegistration] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { authApi.setupStatus().then(value => { setPublicRegistration(value.publicRegistrationEnabled !== false); setClaimAvailable(value.legacyClaimAvailable); setLegacyWaiting(value.legacyDataWaiting) }).catch(() => {}) }, [])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const user = await authApi[mode](form)
      setForm(current => ({ ...current, password: '', setupToken: '' })); setUser(user)
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-intro"><div className="auth-brand">🐟 Fish Farm</div><h1>Your farm. Every fish. Every rupee.</h1><p>Keep feeding, fish transfers and batch costs together.</p></div>
    <form className="auth-card" onSubmit={submit}><h2>{admin ? 'Super Admin login' : mode === 'login' ? 'Welcome back' : 'Set up your farm'}</h2><p className="page-desc">{mode === 'login' ? admin ? 'Manage customers and plans. Enter your authenticator code to continue.' : 'Use your mobile, email or existing username.' : 'Create an owner account. Invite your team after setup.'}</p>
      {mode === 'register' && legacyWaiting && <div className="alert alert-info">{claimAvailable ? 'Existing farm data is preserved. Select “Use my existing farm data” and enter your setup code to access it. An unchecked option creates a separate empty farm.' : 'Existing farm data is waiting for owner setup. Start the API with its setup code before claiming it. A new farm account will be separate and empty.'}</div>}
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <fieldset className="auth-fields" disabled={busy}>
        {mode === 'register' && <><label className="form-group">Your name<input required maxLength={120} autoComplete="name" value={form.displayName} onChange={event => change('displayName', event.target.value)} /></label><label className="form-group">Farm name<input required maxLength={120} value={form.farmName} onChange={event => change('farmName', event.target.value)} /></label></>}
        {mode === 'register' && <><label className="form-group">Mobile number<input required type="tel" maxLength={30} placeholder="+91 98765 43210" autoComplete="tel" value={form.mobile} onChange={event => change('mobile', event.target.value)} /><span className="page-desc">Use your unique mobile number. Include the country code outside India.</span></label><label className="form-group">Email (optional)<input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => change('email', event.target.value)} /></label></>}
        <label className="form-group">{admin || mode === 'register' ? 'Username' : 'Mobile, email or username'}<input required minLength={3} maxLength={mode === 'register' ? 120 : 254} autoComplete="username" value={form.username} onChange={event => change('username', event.target.value)} /></label>
        <label className="form-group">Password<input required type="password" minLength={mode === 'register' ? 10 : 1} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={event => change('password', event.target.value)} /></label>
        {admin && <label className="form-group">Authenticator code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={form.otp} onChange={event => change('otp', event.target.value)} /></label>}
        {mode === 'register' && claimAvailable && <><label className="auth-check"><input type="checkbox" disabled={legacySetup} checked={form.claimExisting} onChange={event => change('claimExisting', event.target.checked)} />Use my existing farm data</label>{form.claimExisting && <label className="form-group">One-time setup code<input required type="password" autoComplete="off" value={form.setupToken} onChange={event => change('setupToken', event.target.value)} /><span className="page-desc">Use the code configured on your server. Existing records stay in this farm.</span></label>}</>}
        <button className="btn btn-primary auth-submit" type="submit">{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create owner account'}</button>
        {!admin && (publicRegistration || legacySetup) && <button className="btn btn-ghost auth-submit" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); change('password', '') }}>{mode === 'login' ? 'Create a farm account' : 'Back to login'}</button>}
        {!admin && mode === 'login' && <><Link className="btn btn-ghost auth-submit" to="/request-trial">New farm? Request a free trial</Link><p className="page-desc">Team member? Ask your farm owner for access.</p></>}
      </fieldset>
    </form></main>
}
