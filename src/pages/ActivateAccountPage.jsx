import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { platformApi } from '../api/platformApi'
import { useAuth } from '../auth/context'

export default function ActivateAccountPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  // Keep the invitation secret in memory; it is never stored in localStorage.
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '')
  const [invitation, setInvitation] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!token) return
    let active = true
    platformApi.invitation(token).then(value => { if (active) setInvitation(value) }).catch(failure => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [token])
  const reset = invitation?.purpose === 'PASSWORD_RESET'
  async function activate(event) {
    event.preventDefault()
    if (password !== confirmation) { setError('Passwords do not match. Enter the same password twice.'); return }
    setBusy(true); setError('')
    try { const user = await platformApi.activate({ token, password }); setPassword(''); setConfirmation(''); setUser(user); navigate('/dashboard', { replace: true }) }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-intro"><div className="auth-brand">🐟 Fish Farm</div><h1>{reset ? 'Get back to your farm.' : 'Your farm is ready.'}</h1><p>Set your password, add your ponds and invite your team.</p></div><section className="auth-card"><h2>{invitation ? `Welcome, ${invitation.ownerName}` : 'Activate your farm'}</h2>{error && <div role="alert" className="alert alert-error">{error}</div>}
    {!token ? <p>This link is incomplete. Ask your provider for a new activation link.</p> : !invitation ? <p>{error ? 'Already activated? You can log in below.' : 'Checking your invitation…'}</p> : <form onSubmit={activate}><p>{invitation.farmName} · {invitation.planName}</p><p className="page-desc">{reset ? 'Choose a new password. Other signed-in sessions will be logged out. Your farm plan and data stay the same.' : `Your ${invitation.trialDays}-day trial starts when you activate. After activation, log in with the mobile or email given to your provider.`}</p><fieldset className="auth-fields" disabled={busy}><label className="form-group">Choose a password<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label><label className="form-group">Confirm password<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label><button type="submit" className="btn btn-primary auth-submit">{busy ? 'Saving…' : reset ? 'Save new password' : 'Activate my farm'}</button></fieldset></form>}
    <Link className="btn btn-ghost auth-submit" to="/login">Back to login</Link>
  </section></main>
}
