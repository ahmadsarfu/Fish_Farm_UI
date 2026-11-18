import { useState } from 'react'
import { platformApi } from '../../api/platformApi'
import Alert from '../Alert'

export default function InviteCustomerForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ ownerName: '', farmName: '', mobile: '', email: '', planName: 'Starter', trialDays: 30, pondLimit: 10, userLimit: 5 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { onCreated(await platformApi.invite({ ...form, trialDays: Number(form.trialDays), pondLimit: Number(form.pondLimit), userLimit: Number(form.userLimit) })) }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form className="card settings-form" onSubmit={submit}><h2 className="card-title">Add a customer</h2><p className="page-desc">Enter their details, then share a private activation link. The customer chooses their own password.</p><Alert msg={error} />
    <fieldset className="auth-fields" disabled={busy}>
      <div className="form-grid-2"><label className="form-group">Owner name<input required maxLength={120} name="ownerName" value={form.ownerName} onChange={change} autoComplete="name" /></label>
      <label className="form-group">Farm name<input required maxLength={120} name="farmName" value={form.farmName} onChange={change} /></label>
      <label className="form-group">Mobile number<input required type="tel" maxLength={30} placeholder="+91 98765 43210" name="mobile" value={form.mobile} onChange={change} autoComplete="tel" /><span className="page-desc">Unique number; include the country code outside India.</span></label>
      <label className="form-group">Email (optional)<input type="email" maxLength={254} name="email" value={form.email} onChange={change} autoComplete="email" /></label></div>
      <details><summary>Plan settings · default 30-day trial, 10 ponds, 5 users</summary><div className="form-grid-2 platform-plan-fields">
        <label className="form-group">Plan name<input required maxLength={80} name="planName" value={form.planName} onChange={change} /></label>
        {[['trialDays', 'Trial days', 365], ['pondLimit', 'Pond limit', 100000], ['userLimit', 'User limit (including owner)', 100000]].map(([name, label, max]) => <label className="form-group" key={name}>{label}<input required type="number" min="1" max={max} name={name} value={form[name]} onChange={change} /></label>)}
      </div></details>
      <div className="feed-actions"><button type="submit" className="btn btn-primary">{busy ? 'Creating…' : 'Create activation link'}</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>
}
