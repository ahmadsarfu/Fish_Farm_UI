import { useEffect, useState } from 'react'

const today = () => new Date().toLocaleDateString('en-CA')
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
const blankEntry = () => ({ pondId: '', feedTypeId: '', feedingDate: today(), feedingTime: 'MORNING', quantityKg: '', notes: '' })
const blankMaster = () => ({ sizeMm: '1', name: '', ratePerKg: '', active: true })

export default function FeedManagementPage({ request }) {
  const [filters, setFilters] = useState(() => ({ from: `${today().slice(0, 7)}-01`, to: today(), pondId: '' }))
  const [applied, setApplied] = useState(filters)
  const [data, setData] = useState({ types: [], ponds: [], entries: [], summary: {} })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)
  const [entry, setEntry] = useState(blankEntry)
  const [editing, setEditing] = useState(null)
  const [master, setMaster] = useState(blankMaster)
  const [masterId, setMasterId] = useState(null)
  const [tab, setTab] = useState('feeding')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    const query = new URLSearchParams({ from: applied.from, to: applied.to })
    if (applied.pondId) query.set('pondId', applied.pondId)
    async function load() {
      try {
        const [types, ponds, entries, summary] = await Promise.all([
          request('/api/feed-types'), request('/api/ponds'), request(`/api/daily-feeds?${query}`), request(`/api/daily-feeds/summary?${query}`),
        ])
        if (!ignore) { setData({ types, ponds, entries, summary }); setLoadError('') }
      } catch (failure) { if (!ignore) setLoadError(failure.message) }
      finally { if (!ignore) setLoading(false) }
    }
    load()
    return () => { ignore = true }
  }, [applied, revision, request])

  const refresh = () => { setLoading(true); setRevision(value => value + 1) }
  const field = (key, value) => setEntry(current => ({ ...current, [key]: value }))
  const selected = data.types.find(type => type.id === Number(entry.feedTypeId))
  const rate = editing?.feedTypeId === Number(entry.feedTypeId) ? editing.ratePerKg : selected?.ratePerKg

  async function save(event, isMaster) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const id = isMaster ? masterId : editing?.id
      const path = isMaster ? '/api/feed-types' : '/api/daily-feeds'
      const body = isMaster ? { ...master, sizeMm: Number(master.sizeMm) }
        : { ...entry, pondId: Number(entry.pondId), feedTypeId: Number(entry.feedTypeId) }
      await request(`${path}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) })
      if (isMaster) { setMaster(blankMaster()); setMasterId(null) }
      else { setEntry(blankEntry()); setEditing(null) }
      setMessage(isMaster ? 'Feed master saved. Historical rates are unchanged.' : 'Feeding saved. Expense calculated automatically.')
      refresh()
    } catch (failure) { setError(failure.message) }
    finally { setSaving(false) }
  }

  async function remove(item) {
    if (!window.confirm(`Delete feeding for ${item.pondName} on ${item.feedingDate}? Its expense will also be removed.`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      await request(`/api/daily-feeds/${item.id}`, { method: 'DELETE' })
      if (editing?.id === item.id) { setEditing(null); setEntry(blankEntry()) }
      setMessage('Feeding and its expense removed.'); refresh()
    } catch (failure) { setError(failure.message) }
    finally { setSaving(false) }
  }

  function edit(item) {
    setEditing(item); setEntry({ ...item, pondId: String(item.pondId), feedTypeId: String(item.feedTypeId), notes: item.notes || '' })
    setError(''); setMessage(''); document.getElementById('feed-entry-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return <div className="page">
    <div className="page-hdr"><div><h1 className="page-title">Daily Feed Management</h1><p className="page-desc">Pond-wise morning and evening feeding with automatic feed expenses</p></div>
      <button className="btn btn-ghost" onClick={refresh} disabled={loading || saving}>Refresh</button></div>
    <div className="tabs" style={{ marginBottom: 20 }}>{['feeding', 'master'].map(value => <button key={value} className={`tab-btn ${tab === value ? 'active' : ''}`} disabled={saving} onClick={() => { setTab(value); setError('') }}>{value === 'feeding' ? 'Daily Feeding' : 'Feed Master (1–4 mm)'}</button>)}</div>
    {loadError && <div role="alert" className="alert alert-error">{loadError} — Check API startup and apply the feed SQL migration.</div>}
    {error && <div role="alert" className="alert alert-error">{error}</div>}
    {message && <div role="status" className="alert alert-success">{message}</div>}
    {tab === 'master' ? <>
      <form className="card" onSubmit={event => save(event, true)}>
        <div className="card-hdr"><h2 className="card-title">{masterId ? 'Edit Feed' : 'Add Feed'}</h2></div>
        <fieldset className="feed-fieldset" disabled={saving || loading || !!loadError}><div className="form-grid-2">
          <label className="form-group">Size (mm)<select aria-label="Size (mm)" required disabled={!!masterId} value={master.sizeMm} onChange={event => setMaster({ ...master, sizeMm: event.target.value })}>{[1, 2, 3, 4].map(size => <option key={size} value={size}>{size} mm</option>)}</select></label>
          <label className="form-group">Feed Name<input required maxLength={100} value={master.name} onChange={event => setMaster({ ...master, name: event.target.value })} /></label>
          <label className="form-group">Rate per kg (₹)<input required type="number" min="0.01" max="99999999.99" step="0.01" value={master.ratePerKg} onChange={event => setMaster({ ...master, ratePerKg: event.target.value })} /></label>
          <label className="form-group">Status<select aria-label="Status" value={String(master.active)} onChange={event => setMaster({ ...master, active: event.target.value === 'true' })}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        </div><p className="page-desc">One master per size. Rate changes apply to new entries; saved feeding entries keep their original rate.</p>
          <div className="feed-actions"><button className="btn btn-primary" type="submit">{saving ? 'Saving...' : 'Save Feed'}</button>{masterId && <button className="btn btn-ghost" type="button" onClick={() => { setMasterId(null); setMaster(blankMaster()); setError('') }}>Cancel Edit</button>}</div>
        </fieldset>
      </form>
      <div className="card table-wrap"><table><thead><tr><th>Size</th><th>Feed</th><th>Rate/kg</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.types.map(type => <tr key={type.id}><td>{type.sizeMm} mm</td><td>{type.name}</td><td>{money(type.ratePerKg)}</td><td>{type.active ? 'Active' : 'Inactive'}</td><td><button className="btn btn-ghost btn-sm" disabled={saving || loading} onClick={() => { setMasterId(type.id); setMaster(type); setError('') }}>Edit</button></td></tr>)}</tbody></table>
        {!loading && !data.types.length && <p className="empty">Add your 1, 2, 3 and 4 mm feeds with their actual rates.</p>}</div>
    </> : <>
      <form id="feed-entry-form" className="card" onSubmit={event => save(event, false)}>
        <div className="card-hdr"><h2 className="card-title">{editing ? 'Edit Feeding' : 'Record Feeding'}</h2></div>
        <fieldset className="feed-fieldset" disabled={saving || loading || !!loadError}><div className="form-grid-2">
          <label className="form-group">Pond<select aria-label="Pond" required value={entry.pondId} onChange={event => field('pondId', event.target.value)}><option value="">Select pond</option>{data.ponds.filter(pond => pond.status === 'ACTIVE' || pond.id === Number(entry.pondId)).map(pond => <option key={pond.id} value={pond.id}>{pond.pondNumber} — {pond.pondName}</option>)}</select></label>
          <label className="form-group">Feeding Date<input required type="date" max={today()} value={entry.feedingDate} onChange={event => field('feedingDate', event.target.value)} /></label>
          <label className="form-group">Feeding Time<select aria-label="Feeding Time" value={entry.feedingTime} onChange={event => field('feedingTime', event.target.value)}><option value="MORNING">Morning</option><option value="EVENING">Evening</option></select></label>
          <label className="form-group">Feed<select aria-label="Feed" required value={entry.feedTypeId} onChange={event => field('feedTypeId', event.target.value)}><option value="">Select feed</option>{data.types.filter(type => type.active || type.id === Number(entry.feedTypeId)).map(type => <option key={type.id} value={type.id}>{type.sizeMm} mm — {type.name}</option>)}</select></label>
          <label className="form-group">Quantity (kg)<input required type="number" min="0.001" max="9999999.999" step="0.001" value={entry.quantityKg} onChange={event => field('quantityKg', event.target.value)} /></label>
          <label className="form-group">Notes<input maxLength={500} value={entry.notes} onChange={event => field('notes', event.target.value)} /></label>
        </div><div className="total-band" style={{ marginTop: 18 }}><div><div className="total-band-label">Feed Expense</div><div className="total-band-sub">{entry.quantityKg || 0} kg × {money(rate)}/kg</div></div><output className="total-band-val">{money(Number(entry.quantityKg || 0) * Number(rate || 0))}</output></div>
          <div className="feed-actions"><button className="btn btn-primary" type="submit">{saving ? 'Saving...' : 'Save Feeding'}</button>{editing && <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setEntry(blankEntry()); setError('') }}>Cancel Edit</button>}</div>
          {!data.types.some(type => type.active) && <p className="page-desc">Add an active feed in Feed Master before recording feeding.</p>}
        </fieldset>
      </form>
      <form className="card feed-fieldset" onSubmit={event => { event.preventDefault(); if (filters.from > filters.to) { setError('From date must be on or before to date'); return } setError(''); setLoading(true); setApplied({ ...filters }) }}>
        <h2 className="card-title">Feeding History & Expenses</h2><div className="feed-filters">
          <label className="form-group">From<input required type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label>
          <label className="form-group">To<input required type="date" min={filters.from} value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label>
          <label className="form-group">Filter Pond<select aria-label="Filter Pond" value={filters.pondId} onChange={event => setFilters({ ...filters, pondId: event.target.value })}><option value="">All ponds</option>{data.ponds.map(pond => <option key={pond.id} value={pond.id}>{pond.pondName}</option>)}</select></label>
          <button className="btn btn-primary" type="submit" disabled={saving}>Apply Filters</button>
        </div>
      </form>
      {loading ? <div role="status" className="loading">Loading feeding records...</div> : !loadError && <>
        <div className="stats-grid"><div className="stat-card stat-pond"><div className="stat-lbl">Feeding Records</div><div className="stat-val">{data.summary.entryCount}</div></div><div className="stat-card stat-blue"><div className="stat-lbl">Total Feed (kg)</div><div className="stat-val">{Number(data.summary.totalQuantityKg || 0).toFixed(3)}</div></div><div className="stat-card stat-amber"><div className="stat-lbl">Total Feed Expense</div><div className="stat-val">{money(data.summary.totalExpense)}</div></div></div>
        <div className="card table-wrap"><table><thead><tr><th>Date</th><th>Pond</th><th>Time</th><th>Feed</th><th>Quantity (kg)</th><th>Rate/kg</th><th>Expense</th><th>Notes</th><th>Actions</th></tr></thead><tbody>{data.entries.map(item => <tr key={item.id}><td>{item.feedingDate}</td><td>{item.pondName}</td><td>{item.feedingTime === 'MORNING' ? 'Morning' : 'Evening'}</td><td>{item.sizeMm} mm — {item.feedName}</td><td>{Number(item.quantityKg).toFixed(3)}</td><td>{money(item.ratePerKg)}</td><td className="td-green">{money(item.expense)}</td><td>{item.notes || '—'}</td><td><div className="feed-actions"><button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => edit(item)}>Edit</button><button className="btn btn-danger btn-sm" disabled={saving} onClick={() => remove(item)}>Delete</button></div></td></tr>)}</tbody></table>{!data.entries.length && <p className="empty">No feeding records for this period.</p>}</div>
      </>}
    </>}
  </div>
}
