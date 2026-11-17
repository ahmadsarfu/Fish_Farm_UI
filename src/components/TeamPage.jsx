import { useEffect, useState } from 'react'
import { request } from '../api'
import { useAuth } from '../auth/context'

const empty = () => ({ displayName: '', username: '', password: '', role: 'LABOUR', pondIds: [] })
export default function TeamPage() {
  const { user, setUser } = useAuth()
  const [audit, setAudit] = useState([])
  const [members, setMembers] = useState([])
  const [ponds, setPonds] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' })
  const [farmName, setFarmName] = useState('')
  useEffect(() => {
    let alive = true
    Promise.all([request('/api/team'), request('/api/ponds'), request('/api/audit')]).then(([team, list, events]) => { if (alive) { setMembers(team); setPonds(list); setAudit(events) } }).catch(failure => { if (alive) setError(failure.message) })
    return () => { alive = false }
  }, [revision])
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await request(`/api/team${editing ? `/${editing}` : ''}`, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setForm(empty()); setEditing(null); setRevision(value => value + 1); setMessage('Team access saved. Changes apply to active sessions immediately.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const toggle = id => setForm(current => ({ ...current, pondIds: current.pondIds.includes(id) ? current.pondIds.filter(value => value !== id) : [...current.pondIds, id] }))
  async function changePassword(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await request('/api/auth/password', { method: 'POST', body: JSON.stringify(password) }); setUser(null) }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function createFarm(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await request('/api/auth/farms', { method: 'POST', body: JSON.stringify({ name: farmName }) }); setUser(await request('/api/auth/me')); setFarmName(''); setMessage('New farm created. Select it from the farm switcher.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <div className="page compact-workspace"><div className="page-hdr"><div><h1 className="page-title">Team & Farm Settings</h1><p className="page-desc">Manage this farm’s users and pond assignments.</p></div></div>
    {error && <div role="alert" className="alert alert-error">{error}</div>}{message && <div role="status" className="alert alert-success">{message}</div>}
    <form className="card settings-form" onSubmit={save}><h2 className="card-title">{editing ? 'Edit farm access' : 'Add team member'}</h2><fieldset disabled={busy} className="auth-fields">
      {!editing && <><label className="form-group">Team member name<input required maxLength={120} value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /></label><label className="form-group">Team username<input required minLength={3} maxLength={120} autoComplete="off" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label><label className="form-group">Initial password<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label></>}
      <label className="form-group">Role<select aria-label="Team role" value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="LABOUR">Labour — assigned feeding only</option><option value="MANAGER">Manager — farm operations and costing</option></select></label>
      {editing && <label className="auth-check"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />Access enabled</label>}
      <div><p className="card-sub">Assigned ponds (used for Labour access)</p><div className="pond-assignments">{ponds.map(pond => <label className="auth-check" key={pond.id}><input type="checkbox" checked={form.pondIds.includes(pond.id)} onChange={() => toggle(pond.id)} />{pond.pondName}</label>)}</div></div>
      <div className="feed-actions"><button className="btn btn-primary" type="submit">{busy ? 'Saving…' : 'Save team member'}</button>{editing && <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(empty()) }}>Cancel</button>}</div>
    </fieldset></form>
    <div className="card table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{members.map(member => <tr key={member.id}><td>{member.displayName}</td><td>{member.username}</td><td>{member.role}</td><td>{member.active ? 'Active' : 'Disabled'}</td><td>{member.role !== 'OWNER' && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setEditing(member.id); setForm({ ...member, password: '' }) }}>Edit access</button>}</td></tr>)}</tbody></table></div>
    <form className="card settings-form" onSubmit={changePassword}><h2 className="card-title">Change your password</h2><p className="page-desc">All your sessions will need to log in again.</p><fieldset className="auth-fields" disabled={busy}><label className="form-group">Current password<input required type="password" autoComplete="current-password" value={password.currentPassword} onChange={event => setPassword({ ...password, currentPassword: event.target.value })} /></label><label className="form-group">New password<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={password.newPassword} onChange={event => setPassword({ ...password, newPassword: event.target.value })} /></label><button className="btn btn-primary" type="submit">Change password</button></fieldset></form>
    <div className="card table-wrap"><div className="card-hdr"><h2 className="card-title">Recent Farm Activity</h2></div><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>{audit.map(event => <tr key={event.id}><td>{event.time ? new Date(`${event.time}Z`).toLocaleString('en-IN', { timeZone: user.timeZone }) : '—'}</td><td>{event.actor}</td><td>{event.action}</td><td>{event.detail}</td></tr>)}</tbody></table></div>
    {user.role === 'OWNER' && <form className="card settings-form" onSubmit={createFarm}><h2 className="card-title">Create another farm</h2><fieldset className="auth-fields" disabled={busy}><label className="form-group">New farm name<input required maxLength={120} value={farmName} onChange={event => setFarmName(event.target.value)} /></label><button className="btn btn-primary" type="submit">Create farm</button></fieldset></form>}
  </div>
}
