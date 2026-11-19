import { useCallback, useState } from 'react'
import { platformApi } from '../../api/platformApi'
import useData from '../../hooks/useData'
import Alert from '../../components/Alert'
import Loader from '../../components/Loader'
import ActivationLink from '../../components/platform/ActivationLink'

export default function PlatformTrialRequestsPage() {
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(0)
  const fetchRows = useCallback(() => platformApi.trialRequests(status, page), [status, page])
  const { data, loading, error, reload } = useData(fetchRows)
  const [selected, setSelected] = useState(null)
  const [plan, setPlan] = useState({ planName: 'Starter', trialDays: 30, pondLimit: 10, userLimit: 5 })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [invitation, setInvitation] = useState(null)
  async function approve(event) {
    event.preventDefault(); setBusy(true); setActionError('')
    try { setInvitation(await platformApi.approveTrial(selected.id, { ...plan, trialDays: Number(plan.trialDays), pondLimit: Number(plan.pondLimit), userLimit: Number(plan.userLimit) })); setSelected(null); await reload() }
    catch (failure) { setActionError(failure.message) } finally { setBusy(false) }
  }
  async function reject() {
    if (!window.confirm(`Reject the trial request for ${selected.farmName}?`)) return
    setBusy(true); setActionError('')
    try { await platformApi.rejectTrial(selected.id); setSelected(null); await reload() }
    catch (failure) { setActionError(failure.message) } finally { setBusy(false) }
  }
  return <div className="page compact-workspace platform-page"><div className="page-hdr"><div><h1 className="page-title">Trial requests</h1><p className="page-desc">Verify the customer's contact details before approving. Share activation links privately; delivery is manual.</p></div><button className="btn btn-ghost" disabled={busy} onClick={reload}>Refresh</button></div>
    <Alert msg={error || actionError} />
    {invitation && <ActivationLink key={invitation.activationPath} invitation={invitation} onClose={() => setInvitation(null)} />}
    {selected && <form className="card settings-form" onSubmit={approve}><h2 className="card-title">Review {selected.farmName}</h2><p>{selected.ownerName} · {selected.mobile}</p><p>{selected.email}</p><p className="page-desc">Approval creates a separate farm and inactive owner account. The trial starts when the owner activates.</p><fieldset className="auth-fields" disabled={busy}><div className="form-grid-2"><label className="form-group">Plan name<input required maxLength={80} value={plan.planName} onChange={event => setPlan(current => ({ ...current, planName: event.target.value }))} /></label>{[['trialDays', 'Trial days', 365], ['pondLimit', 'Pond limit', 100000], ['userLimit', 'User limit (including owner)', 100000]].map(([key, label, max]) => <label className="form-group" key={key}>{label}<input type="number" required min="1" max={max} value={plan[key]} onChange={event => setPlan(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div><div className="feed-actions"><button className="btn btn-primary" type="submit">{busy ? 'Please wait…' : 'Approve & create activation link'}</button><button className="btn btn-ghost" type="button" onClick={reject}>Reject request</button><button className="btn btn-ghost" type="button" onClick={() => setSelected(null)}>Cancel</button></div></fieldset></form>}
    <label className="form-group">Request status<select value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setPage(0); setSelected(null) }}>{['PENDING', 'APPROVED', 'REJECTED'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <div className="card table-wrap">{loading ? <Loader /> : <table><thead><tr><th>Customer / farm</th><th>Contact</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead><tbody>{(data?.items || []).map(row => <tr key={row.id}><td><strong>{row.ownerName}</strong><div>{row.farmName}</div></td><td>{row.mobile}<div>{row.email}</div></td><td>{new Date(row.createdAt).toLocaleDateString('en-IN')}</td><td>{row.status}</td><td>{row.status === 'PENDING' ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setSelected(row); setInvitation(null); setActionError(''); setPlan({ planName: 'Starter', trialDays: 30, pondLimit: 10, userLimit: 5 }) }}>Review</button> : row.status === 'APPROVED' ? 'Manage links in Customers & plans' : 'Closed'}</td></tr>)}</tbody></table>}{!loading && !data?.items?.length && <p className="empty">No {status.toLowerCase()} requests.</p>}</div>
    <div className="platform-pagination"><span>{data?.total ?? 0} requests · Page {page + 1}</span><button className="btn btn-ghost btn-sm" disabled={busy || loading || page === 0} onClick={() => setPage(current => current - 1)}>Previous</button><button className="btn btn-ghost btn-sm" disabled={busy || loading || page + 1 >= (data?.pages || 1)} onClick={() => setPage(current => current + 1)}>Next</button></div>
  </div>
}
