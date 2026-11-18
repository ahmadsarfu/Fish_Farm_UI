import { useCallback, useState } from 'react'
import { platformApi } from '../../api/platformApi'
import useData from '../../hooks/useData'
import Alert from '../../components/Alert'
import Loader from '../../components/Loader'
import InviteCustomerForm from '../../components/platform/InviteCustomerForm'
import SubscriptionForm from '../../components/platform/SubscriptionForm'
import ActivationLink from '../../components/platform/ActivationLink'

export default function PlatformCustomersPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const fetchCustomers = useCallback(() => platformApi.customers(query, page), [query, page])
  const { data, loading, error, reload } = useData(fetchCustomers)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  async function reissue(customer) {
    if (!window.confirm(`Create a new activation link for ${customer.farmName}? Their previous link will stop working.`)) return
    setBusy(true); setActionError('')
    try { setInvitation(await platformApi.activationLink(customer.id)); setAdding(false); setEditing(null); await reload() }
    catch (failure) { setActionError(failure.message) } finally { setBusy(false) }
  }
  async function resetPassword(customer) {
    if (!window.confirm(`Create a password reset link for ${customer.ownerName}? Verify their identity before sharing the link. This replaces any earlier reset link.`)) return
    setBusy(true); setActionError('')
    try { setInvitation(await platformApi.passwordReset(customer.id)); setAdding(false); setEditing(null) }
    catch (failure) { setActionError(failure.message) } finally { setBusy(false) }
  }
  return <div className="page compact-workspace platform-page">
    <div className="page-hdr"><div><h1 className="page-title">Your customers</h1><p className="page-desc">Add a farm, share its activation link, then manage access as your business grows.</p></div><button className="btn btn-primary" disabled={busy} onClick={() => { setAdding(true); setEditing(null); setInvitation(null); setMessage('') }}>+ Add customer</button></div>
    <div className="platform-steps"><span>1. Add customer</span><span>2. Share activation link</span><span>3. Customer starts farming</span></div>
    <Alert msg={error || actionError} />{message && <div role="status" className="alert alert-success">{message}</div>}
    {adding && <InviteCustomerForm onCancel={() => setAdding(false)} onCreated={result => { setInvitation(result); setAdding(false); reload() }} />}
    {invitation && <ActivationLink key={invitation.activationPath} invitation={invitation} onClose={() => setInvitation(null)} />}
    {editing && <SubscriptionForm key={editing.id} customer={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage('Plan saved. Access changes apply immediately.'); reload() }} />}
    <form className="platform-search" onSubmit={event => { event.preventDefault(); setPage(0); setQuery(search) }}><label className="form-group">Find a farm<input value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder="Farm name" /></label><button className="btn btn-ghost" type="submit">Search</button></form>
    <div className="card table-wrap">{loading ? <Loader /> : <table><thead><tr><th>Customer / farm</th><th>Contact</th><th>Setup</th><th>Plan / access</th><th>Limits</th><th>Actions</th></tr></thead><tbody>{(data?.items || []).map(customer => <tr key={customer.id}>
      <td><strong>{customer.farmName}</strong><div className="page-desc">{customer.ownerName}</div></td>
      <td>{customer.mobile || 'Not added'}<div className="page-desc">{customer.email}</div></td>
      <td>{({ INVITED: 'Awaiting activation', LINK_EXPIRED: 'Link expired', ACTIVATED: 'Ready', EXISTING: 'Existing farm', AWAITING_PLAN: 'Awaiting plan', EXISTING_ACCOUNT: 'Account ready' })[customer.onboarding]}</td>
      <td>{customer.subscription.planName}<div className="page-desc">{!customer.subscription.accessAllowed ? 'Paused / expired' : customer.subscription.status === 'TRIAL' ? 'Trial' : 'Active'}{customer.subscription.endsOn && ` · until ${customer.subscription.endsOn}`}</div></td>
      <td>{customer.subscription.pondLimit ?? 'Unlimited'} ponds<div className="page-desc">{customer.activeUsers} / {customer.subscription.userLimit ?? 'unlimited'} users</div></td>
      <td><div className="feed-actions"><button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setEditing(customer); setAdding(false); setInvitation(null) }}>Manage plan</button>{customer.onboarding === 'ACTIVATED' && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => resetPassword(customer)}>Reset password</button>}{['INVITED', 'LINK_EXPIRED'].includes(customer.onboarding) && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => reissue(customer)}>New activation link</button>}</div></td>
    </tr>)}</tbody></table>}{!loading && !data?.items?.length && <p className="empty">No customers yet. Add your first customer to get started.</p>}</div>
    <div className="platform-pagination"><span>{data?.total ?? 0} farms · Page {page + 1}</span><button className="btn btn-ghost btn-sm" disabled={loading || page === 0} onClick={() => setPage(current => current - 1)}>Previous</button><button className="btn btn-ghost btn-sm" disabled={loading || page + 1 >= (data?.pages || 1)} onClick={() => setPage(current => current + 1)}>Next</button></div>
  </div>
}
