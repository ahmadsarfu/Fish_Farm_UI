import { useState } from 'react'
import { platformApi } from '../../api/platformApi'
import Alert from '../Alert'

export default function SubscriptionForm({ customer, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...customer.subscription, endsOn: customer.subscription.endsOn || '', pondLimit: customer.subscription.pondLimit || 10, userLimit: customer.subscription.userLimit || 5 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await platformApi.updateSubscription(customer.id, { status: form.status, planName: form.planName, endsOn: form.endsOn || null, pondLimit: Number(form.pondLimit), userLimit: Number(form.userLimit) }); onSaved() }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form className="card settings-form" onSubmit={submit}><h2 className="card-title">Manage plan · {customer.farmName}</h2><p className="page-desc">Record payment separately, then activate or extend access here. Pausing access preserves the customer's data.</p><Alert msg={error} /><fieldset disabled={busy} className="auth-fields"><div className="form-grid-2">
    <label className="form-group">Plan name<input required maxLength={80} name="planName" value={form.planName} onChange={change} /></label>
    <label className="form-group">Access<select aria-label="Plan access" name="status" value={form.status} onChange={change}><option value="TRIAL">Trial</option><option value="ACTIVE">Active / paid</option><option value="SUSPENDED">Paused</option></select></label>
    <label className="form-group">Access until<input aria-label="Access until" type="date" name="endsOn" value={form.endsOn} onChange={change} /><span className="page-desc">Leave empty for access without an expiry date.</span></label>
    <label className="form-group">Pond limit<input required type="number" min="1" max="100000" name="pondLimit" value={form.pondLimit} onChange={change} /></label>
    <label className="form-group">User limit (including owner)<input required type="number" min="1" max="100000" name="userLimit" value={form.userLimit} onChange={change} /></label>
    </div><div className="feed-actions"><button type="submit" className="btn btn-primary">{busy ? 'Saving…' : 'Save plan'}</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button></div></fieldset></form>
}
