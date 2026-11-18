import { useState } from 'react'
import { authApi } from '../api/authApi'
import { useAuth } from '../auth/context'
export default function AccountPage() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await authApi.changePassword(form); setUser(null) }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <div className="page compact-workspace"><h1 className="page-title">My Account</h1><p className="page-desc">{user.displayName} · {user.mobile || user.email || user.username} · {user.role}</p>{error && <div role="alert" className="alert alert-error">{error}</div>}<form className="card settings-form" style={{ marginTop: 22 }} onSubmit={save}><h2 className="card-title">Change password</h2><p className="page-desc">All your sessions will need to log in again.</p><fieldset className="auth-fields" disabled={busy}><label className="form-group">Current password<input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={event => setForm({ ...form, currentPassword: event.target.value })} /></label><label className="form-group">New password<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={form.newPassword} onChange={event => setForm({ ...form, newPassword: event.target.value })} /></label><button className="btn btn-primary" type="submit">{busy ? 'Saving…' : 'Change password'}</button></fieldset></form></div>
}
