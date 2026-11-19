import { useState } from 'react'
import { Link } from 'react-router-dom'
import { platformApi } from '../api/platformApi'
import Alert from '../components/Alert'

export default function TrialRequestPage() {
  const [form, setForm] = useState({ ownerName: '', farmName: '', mobile: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await platformApi.requestTrial(form); setDone(true); setForm({ ownerName: '', farmName: '', mobile: '', email: '' }) }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-intro"><div className="auth-brand">🐟 Fish Farm</div><h1>Your farm. Every fish. Every rupee.</h1><p>Manage feeding, stock and expenses in one place.</p></div>
    <section className="auth-card">{done ? <div role="status"><h2>Request received!</h2><p>We will contact you on the number provided and share an activation link after approval.</p><p className="page-desc">Already have an account? Log in or contact your provider. This request does not create a farm or start a trial.</p></div> : <form onSubmit={submit}><h2>Request a free trial</h2><p className="page-desc">Tell us about your farm. After approval, you will receive a link to set your own password.</p><Alert msg={error} /><fieldset className="auth-fields" disabled={busy}>
      {[['ownerName', 'Your name', 'text', 120, 'name'], ['farmName', 'Farm name', 'text', 120, 'organization'], ['mobile', 'Mobile number', 'tel', 30, 'tel'], ['email', 'Email (optional)', 'email', 254, 'email']].map(([key, label, type, max, auto]) => <label className="form-group" key={key}>{label}<input aria-label={label} required={key !== 'email'} type={type} maxLength={max} autoComplete={auto} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />{key === 'mobile' && <span className="page-desc">For India, enter 10 digits. Otherwise include your country code.</span>}</label>)}
      <button className="btn btn-primary auth-submit" type="submit">{busy ? 'Sending…' : 'Request free trial'}</button><p className="page-desc">By submitting, you agree we may contact you about this request. Team members should ask their farm owner for access.</p>
    </fieldset></form>}<Link className="btn btn-ghost auth-submit" to="/login">Back to login</Link></section></main>
}
