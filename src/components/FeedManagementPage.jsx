import { useEffect, useState } from 'react'
import FeedRecordsPage from './FeedRecordsPage'

const today = () => new Date().toLocaleDateString('en-CA')
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
const kg = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })

export default function FeedManagementPage({ request }) {
  const [date, setDate] = useState(today)
  const [tab, setTab] = useState('checklist')
  const [dashboard, setDashboard] = useState(null)
  const [types, setTypes] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (tab === 'records') return
    let ignore = false
    async function load() {
      try {
        const [result, masters] = await Promise.all([
          request(`/api/feeding-dashboard?date=${date}`), request('/api/feed-types'),
        ])
        if (!ignore) { setDashboard(result); setTypes(masters); setError('') }
      } catch (failure) { if (!ignore) setError(failure.message) }
      finally { if (!ignore) setLoading(false) }
    }
    load()
    return () => { ignore = true }
  }, [date, revision, request, tab])

  const refresh = () => { setLoading(true); setRevision(value => value + 1) }
  const switchTab = value => { if (value === tab) return; setTab(value); setError(''); setMessage(''); if (value !== 'records') setLoading(true) }
  const rows = dashboard?.ponds || []
  const missing = rows.filter(row => row.active && !row.config).length
  const completed = dashboard?.completedSlots || 0
  const planned = dashboard?.plannedSlots || 0

  async function tick(row, time, slot) {
    const label = time === 'MORNING' ? 'AM' : 'PM'
    if (slot.completed && !window.confirm(`Undo ${label} feeding for ${row.pondName} on ${date}? This removes all saved feed entries and ${money(slot.expense)} expense for this slot.`)) return
    setBusy(`${row.pondId}-${time}`); setError(''); setMessage('')
    try {
      const result = await request(`/api/feeding-dashboard/${row.pondId}/slots/${time}`, {
        method: 'PUT', body: JSON.stringify({ date, completed: !slot.completed }),
      })
      setDashboard(result)
      setMessage(`${row.pondName} · ${label} ${slot.completed ? 'feeding undone' : 'feeding saved'}`)
    } catch (failure) { setError(failure.message) }
    finally { setBusy('') }
  }

  function draft(row) {
    return drafts[row.pondId] || {
      feedTypeId: row.config?.feedTypeId ? String(row.config.feedTypeId) : '',
      morningQtyKg: row.config?.morningQtyKg ?? '', eveningQtyKg: row.config?.eveningQtyKg ?? '',
    }
  }
  function update(row, key, value) {
    setDrafts(current => ({ ...current, [row.pondId]: { ...draft(row), [key]: value } }))
  }
  async function saveSetup(event, row) {
    event.preventDefault(); setBusy(`setup-${row.pondId}`); setError(''); setMessage('')
    const values = draft(row)
    try {
      const result = await request(`/api/pond-feed-configs/${row.pondId}?date=${date}`, {
        method: 'PUT', body: JSON.stringify({ ...values, feedTypeId: Number(values.feedTypeId) }),
      })
      setDashboard(result)
      setDrafts(current => { const next = { ...current }; delete next[row.pondId]; return next })
      setMessage(`${row.pondName} setup saved. Completed feeding quantities and costs stay unchanged.`)
    } catch (failure) { setError(failure.message) }
    finally { setBusy('') }
  }

  function slotCell(row, time, slot) {
    const quantity = time === 'MORNING' ? row.config?.morningQtyKg : row.config?.eveningQtyKg
    const enabled = slot.completed || (row.active && row.config?.feedActive && Number(quantity) > 0 && Number(row.config?.ratePerKg) > 0)
    const label = time === 'MORNING' ? 'AM' : 'PM'
    const pending = busy === `${row.pondId}-${time}`
    return <td className="feed-slot-cell">
      <label className={`feed-tick ${slot.completed ? 'is-done' : ''}`}>
        <input type="checkbox" checked={slot.completed} disabled={!!busy || loading || !enabled || date > today()}
          aria-label={`${label} feeding for ${row.pondName}`} onChange={() => tick(row, time, slot)} />
        <span aria-hidden="true">{pending ? '…' : slot.completed ? '✓' : ''}</span>
      </label>
      <div className="feed-slot-note">{pending ? 'Saving…' : slot.completed ? `${kg(slot.quantityKg)} kg · ${money(slot.expense)}` : !row.config ? 'Set up first' : Number(quantity) === 0 ? 'Not planned' : !enabled ? 'Check setup / rate' : `${kg(quantity)} kg`}</div>
      {slot.completed && <div className="feed-slot-note">{slot.entries.map(entry => `${entry.sizeMm} mm`).join(', ')}</div>}
    </td>
  }

  return <div className="page feed-workspace">
    <div className="page-hdr"><div><h1 className="page-title">Daily Feed Management</h1><p className="page-desc">Feed daalo, AM / PM tick karo. Kharcha apne aap save hoga.</p></div>
      {tab !== 'records' && <button className="btn btn-ghost" disabled={!!busy || loading} onClick={refresh}>Refresh</button>}</div>
    <div className="tabs feed-tabs">{[['checklist', 'Daily Checklist'], ['setup', 'Pond Feed Setup'], ['records', 'Feed Master & Records']].map(([value, label]) => <button key={value} className={`tab-btn ${tab === value ? 'active' : ''}`} disabled={!!busy} onClick={() => switchTab(value)}>{label}</button>)}</div>
    {error && <div role="alert" className="alert alert-error">{error}</div>}
    {message && <div role="status" className="alert alert-success">{message}</div>}
    {tab === 'records' ? <FeedRecordsPage request={request} embedded /> : <>
      <div className="feed-date-row"><label className="form-group">Feeding Date<input type="date" required max={today()} value={date} disabled={!!busy} onChange={event => { if (event.target.value) { setDate(event.target.value); setLoading(true); setMessage('') } }} /></label><p className="page-desc">{tab === 'setup' ? 'Set quantities once. Labour only needs to tick AM / PM.' : 'Tick only after feeding is complete. Saved ticks remain after refresh.'}</p></div>
      {loading ? <div role="status" className="loading">Loading ponds…</div> : dashboard?.date === date && <>
        {tab === 'checklist' ? <>
          <div className="stats-grid feed-checklist-stats"><div className="stat-card stat-green"><div className="stat-lbl">Feedings Completed</div><div className="stat-val">{completed}<span className="feed-stat-denominator">/{planned}</span></div><div className="stat-unit">AM / PM slots planned</div></div><div className="stat-card stat-amber"><div className="stat-lbl">Daily Feed Cost</div><div className="stat-val">{money(dashboard.totalExpense)}</div><div className="stat-unit">For completed feeding only</div></div></div>
          {!!missing && <div className="alert alert-info">{missing} pond(s) need feed setup. <button className="btn btn-ghost btn-sm" onClick={() => switchTab('setup')}>Set up ponds</button></div>}
          <div className="card"><div className="table-wrap"><table className="feed-checklist"><thead><tr><th>Pond</th><th>Feed</th><th>Kg / AM · PM</th><th>AM</th><th>PM</th></tr></thead><tbody>{rows.map(row => <tr key={row.pondId}><td><strong>{row.pondName}</strong><div className="feed-slot-note">{row.pondNumber}{!row.active && ' · Inactive'}</div></td><td>{row.config ? <>{row.config.sizeMm} mm<div className="feed-slot-note">{row.config.feedName} · {money(row.config.ratePerKg)}/kg</div></> : 'Not configured'}</td><td>{row.config ? `${kg(row.config.morningQtyKg)} / ${kg(row.config.eveningQtyKg)}` : '—'}</td>{slotCell(row, 'MORNING', row.morning)}{slotCell(row, 'EVENING', row.evening)}</tr>)}</tbody></table></div>
            {!rows.length && <p className="empty">No active ponds. Add a pond in Ponds to begin.</p>}
            <div className="feed-progress"><div><strong>Total Feeding Expense</strong><strong>{money(dashboard.totalExpense)}</strong></div><div className="page-desc">Completed slots: {completed} of {planned}</div><progress aria-label="Completed feeding slots" max={planned || 1} value={completed} /></div>
          </div><p className="page-desc">Completed ticks keep their saved feed, quantity and rate. To correct a mistaken tick, untick it and confirm.</p>
        </> : <>
          <div className="alert alert-info">Choose feed size and AM / PM quantities for each pond. Use 0 for a time with no planned feeding. Set actual prices in Feed Master.</div>
          {rows.filter(row => row.active).map(row => { const values = draft(row); return <form className="card feed-setup-card" key={row.pondId} onSubmit={event => saveSetup(event, row)}><div><h2 className="card-title">{row.pondName}</h2><p className="card-sub">{row.pondNumber}</p></div><fieldset disabled={!!busy} className="feed-setup-fields"><label className="form-group">Feed for {row.pondName}<select aria-label={`Feed for ${row.pondName}`} required value={values.feedTypeId} onChange={event => update(row, 'feedTypeId', event.target.value)}><option value="">Select feed</option>{types.filter(type => type.active || type.id === Number(values.feedTypeId)).map(type => <option key={type.id} value={type.id}>{type.sizeMm} mm — {type.name}{!type.active ? ' (inactive)' : ''}</option>)}</select></label><label className="form-group">AM kg for {row.pondName}<input type="number" min="0" max="9999999.999" step="0.001" required value={values.morningQtyKg} onChange={event => update(row, 'morningQtyKg', event.target.value)} /></label><label className="form-group">PM kg for {row.pondName}<input type="number" min="0" max="9999999.999" step="0.001" required value={values.eveningQtyKg} onChange={event => update(row, 'eveningQtyKg', event.target.value)} /></label><button className="btn btn-primary" type="submit">{busy === `setup-${row.pondId}` ? 'Saving…' : `Save ${row.pondName}`}</button></fieldset></form> })}
          {!rows.some(row => row.active) && <p className="empty">Add an active pond first.</p>}
        </>}
      </>}
    </>}
  </div>
}
