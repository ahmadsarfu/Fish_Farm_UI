import { businessDate } from '../businessDate'
import { useEffect, useState } from 'react'
import { batchApi } from '../api/batchApi'
import { pondApi } from '../api/pondApi'
import { fishApi } from '../api/fishTypeApi'
import { fishStockApi } from '../api/fishStockApi'

const today = businessDate
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
const key = () => {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
const newBatch = () => ({ code: `B-${today().replaceAll('-', '')}-${key().slice(0, 6).toUpperCase()}`, name: '', stockEntryId: '', fishTypeId: '', pondId: '', date: today(), count: '', purchaseCost: '', historicalCost: '0' })
const operation = () => ({ requestId: key(), date: today(), count: '', reason: '', targetPondId: '', transferCost: '0', notes: '', category: 'OTHER', amount: '', weightKg: '', revenue: '0' })

export default function BatchesPage() {
  const [data, setData] = useState({ batches: [], ponds: [], fishes: [], stock: [] })
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(newBatch)
  const [action, setAction] = useState(operation)
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [batches, ponds, fishes, stock, detail] = await Promise.all([
          batchApi.getAll(), pondApi.getAll(), fishApi.getAll(), fishStockApi.getAll(),
          selected ? batchApi.getById(selected) : Promise.resolve(null),
        ])
        if (alive) { setData({ batches, ponds, fishes, stock }); setDetails(detail); setError('') }
      } catch (failure) { if (alive) setError(failure.message) }
      finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [selected, revision])
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape' && !busy) setModal(null) }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [busy])
  const reload = () => { setLoading(true); setRevision(value => value + 1) }
  const select = id => { setSelected(id); setLoading(true); setError(''); setMessage('') }
  const start = (type, stage) => { setModal({ type, stage }); setAction(operation()); setError(''); setMessage('') }
  const field = (name, value) => setAction(current => ({ ...current, [name]: value, requestId: key() }))
  function chooseStock(id) {
    const entry = data.stock.find(item => item.id === Number(id))
    setForm(current => entry ? { ...current, stockEntryId: id, fishTypeId: String(entry.fishTypeId), pondId: String(entry.pondId), date: entry.stockDate, count: entry.quantity ?? '', purchaseCost: entry.purchaseAmount } : { ...current, stockEntryId: '' })
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      let result
      if (modal.type === 'create') {
        result = await batchApi.create({ ...form, stockEntryId: form.stockEntryId ? Number(form.stockEntryId) : null, pondId: form.pondId ? Number(form.pondId) : null, fishTypeId: form.fishTypeId ? Number(form.fishTypeId) : null, count: Number(form.count) })
      } else {
        const body = { ...action, count: Number(action.count), targetPondId: action.targetPondId ? Number(action.targetPondId) : null }
        result = await batchApi.recordOperation(modal.stage.id, modal.type, body)
      }
      setDetails(result); setSelected(result.id); setModal(null); setMessage('Saved. Fish counts and batch costs have been updated.'); reload()
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  const detail = details?.id === selected ? details : null
  const stageName = id => { const stage = detail?.stages.find(value => value.id === id); return stage ? `${stage.label} · ${stage.pondName}` : 'Stage' }
  return <div className="page compact-workspace">
    <div className="page-hdr"><div><h1 className="page-title">Batches & Stage Costing</h1><p className="page-desc">Follow fish from nursery to grow-out, including losses and transfers.</p></div><div className="feed-actions">{selected && <button className="btn btn-ghost" disabled={busy} onClick={() => select(null)}>All batches</button>}<button className="btn btn-primary" disabled={busy} onClick={() => { setForm(newBatch()); setModal({ type: 'create' }); setError('') }}>+ Start Batch</button></div></div>
    {error && <div role="alert" className="alert alert-error">{error}</div>}{message && <div role="status" className="alert alert-success">{message}</div>}
    {loading ? <div role="status" className="loading">Loading batches…</div> : !selected ? <div className="card table-wrap"><table><thead><tr><th>Batch</th><th>Fish</th><th>Initial / Remaining</th><th>Mortality</th><th>Total Cost</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.batches.map(batch => <tr key={batch.id}><td><strong>{batch.code}</strong><div className="card-sub">{batch.name}</div></td><td>{batch.fishTypeName}</td><td>{batch.initialCount} / {batch.remainingCount}</td><td>{batch.deadCount}</td><td>{money(batch.totalExpense)}</td><td>{batch.closed ? 'Closed' : 'Growing'}</td><td><button className="btn btn-ghost btn-sm" onClick={() => select(batch.id)}>View batch</button></td></tr>)}</tbody></table>{!data.batches.length && <div className="empty"><p className="empty-text">Start your first nursery batch</p><p className="empty-sub">One active batch per pond. Daily feeding will add costs automatically.</p></div>}</div> : detail && <>
      <div className="card batch-intro"><div><h2>{detail.code} · {detail.name}</h2><p className="page-desc">{detail.fishTypeName} · Started {detail.startedOn}</p></div><span className={`badge ${detail.closed ? 'badge-muted' : 'badge-green'}`}>{detail.closed ? 'Closed' : 'Growing'}</span></div>
      <div className="stats-grid"><div className="stat-card stat-blue"><div className="stat-lbl">Remaining Fish</div><div className="stat-val">{detail.remainingCount}</div><div className="stat-unit">from {detail.initialCount} initially stocked</div></div><div className="stat-card stat-red"><div className="stat-lbl">Mortality</div><div className="stat-val">{detail.deadCount}</div></div><div className="stat-card stat-amber"><div className="stat-lbl">Total Batch Expense</div><div className="stat-val">{money(detail.totalExpense)}</div><div className="stat-unit">Purchase + feed + other additions</div></div><div className="stat-card stat-green"><div className="stat-lbl">{detail.closed ? 'Recorded Revenue − Total Cost' : 'Recorded Settlement Revenue'}</div><div className="stat-val">{money(detail.closed ? detail.finalProfit : detail.revenue)}</div><div className="stat-unit">{detail.closed ? 'Based on settlements recorded so far' : 'Costing continues while fish remain'}</div></div></div>
      <div className="card settings-form"><h2 className="card-title">Cost by phase</h2><dl className="cost-breakdown"><div><dt>Stage 1 · Nursery (including seed)</dt><dd>{money(detail.nurseryExpense)}</dd></div><div><dt>Transfer expenses</dt><dd>{money(detail.transferExpense)}</dd></div><div><dt>Stage 2 · Grow-out additions</dt><dd>{money(detail.growOutExpense)}</dd></div>{detail.finalCostPerKg != null && <div><dt>Total batch cost / harvested kg</dt><dd>{money(detail.finalCostPerKg)}</dd></div>}</dl></div>
      <p className="alert alert-info">Transferred cost follows the fish; it is not counted twice in total expenses. Losses increase the cost per surviving fish.</p>
      <div className="batch-stage-grid">{detail.stages.map(stage => <article className="card batch-stage-card" key={stage.id}><div className="card-hdr"><div><h3 className="card-title">Stage {stage.stageNumber} · {stage.label}</h3><p className="card-sub">{stage.pondName}{stage.parentStageId && ` · from ${stageName(stage.parentStageId)}`}</p></div><span className={`badge ${stage.remainingCount ? 'badge-green' : 'badge-muted'}`}>{stage.remainingCount ? 'Active' : 'Closed'}</span></div><div className="batch-stage-body"><div className="info-grid"><div><div className="info-lbl">Remaining / Opening</div><div className="info-val">{stage.remainingCount} / {stage.openingCount}</div></div><div><div className="info-lbl">Deaths / Transferred / Harvested</div><div className="info-val">{stage.deadCount} / {stage.transferredCount} / {stage.harvestedCount}</div></div></div><dl className="cost-breakdown"><div><dt>Opening / carried-in cost</dt><dd>{money(stage.openingCost)}</dd></div><div><dt>New costs in this stage</dt><dd>{money(stage.addedCost)}</dd></div><div><dt>Included feed cost</dt><dd>{money(stage.feedCost)}</dd></div><div><dt>Cost carried forward</dt><dd>{money(stage.carriedOutCost)}</dd></div><div><dt>Cost assigned to harvest</dt><dd>{money(stage.harvestedCost)}</dd></div><div><dt>Remaining cost balance</dt><dd>{money(stage.remainingCost)}</dd></div><div><dt>{stage.remainingCount ? 'Cost / surviving fish' : 'Unrecovered loss cost'}</dt><dd>{money(stage.remainingCount ? stage.costPerRemainingFish : stage.lossCost)}</dd></div></dl>
        {stage.remainingCount > 0 && <div className="feed-actions"><button className="btn btn-ghost btn-sm" onClick={() => start('expenses', stage)}>+ Expense</button><button className="btn btn-danger btn-sm" onClick={() => start('mortality', stage)}>Record mortality</button><button className="btn btn-primary btn-sm" onClick={() => start('transfers', stage)}>Transfer fish</button><button className="btn btn-amber btn-sm" onClick={() => start('harvests', stage)}>Harvest / settle</button></div>}<div className="feed-actions"><button className="btn btn-ghost btn-sm" onClick={() => start('settlements', stage)}>+ Sale settlement</button></div></div></article>)}</div>
      <div className="card"><div className="card-hdr"><h2 className="card-title">Expense Ledger</h2></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Stage</th><th>Category</th><th>Amount</th><th>Notes</th></tr></thead><tbody>{detail.expenses.map(expense => <tr key={expense.id}><td>{expense.date}</td><td>{stageName(expense.stageId)}</td><td>{expense.category}</td><td>{money(expense.amount)}</td><td>{expense.notes || '—'}</td></tr>)}</tbody></table>{!detail.expenses.length && <p className="empty">No stage additions yet. Seed purchase is included in opening cost.</p>}</div></div>
      <div className="card"><div className="card-hdr"><h2 className="card-title">Movement History</h2></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Event</th><th>Stage / Pond</th><th>Fish</th><th>Carried / Harvest Cost</th><th>Revenue</th><th>Notes</th></tr></thead><tbody>{detail.movements.map(event => <tr key={event.id}><td>{event.date}</td><td>{event.kind}</td><td>{stageName(event.stageId)}{event.targetStageId && ` → ${stageName(event.targetStageId)}`}</td><td>{event.count || '—'}</td><td>{money(event.carriedCost)}</td><td>{money(event.revenue)}</td><td>{event.notes || '—'}</td></tr>)}</tbody></table>{!detail.movements.length && <p className="empty">No movements recorded.</p>}</div></div>
    </>}
    {modal && <div className="overlay"><form className="modal modal-lg" onSubmit={submit}><div className="modal-hdr"><h2 className="modal-title">{({ create: 'Start nursery batch', mortality: 'Record mortality', expenses: 'Add stage expense', transfers: 'Transfer fish to grow-out', harvests: 'Harvest and record settlement', settlements: 'Record additional sale revenue' })[modal.type]}</h2><button type="button" className="modal-close" disabled={busy} onClick={() => setModal(null)} aria-label="Close batch form">✕</button></div><div className="modal-body">{error && <div role="alert" className="alert alert-error">{error}</div>}<fieldset disabled={busy} className="auth-fields">
      {modal.type === 'create' ? <>
        <label className="form-group">Batch code<input required maxLength={40} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></label><label className="form-group">Batch name<input required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label className="form-group">Existing stock entry (optional)<select aria-label="Existing stock entry" value={form.stockEntryId} onChange={event => chooseStock(event.target.value)}><option value="">New seed purchase — also add to Fish Stock</option>{data.stock.filter(entry => !data.batches.some(batch => batch.stockEntryId === entry.id)).map(entry => <option key={entry.id} value={entry.id}>{entry.stockDate} · {entry.pondName} · {entry.fishTypeName} · {entry.quantity ?? '?'} fish</option>)}</select></label>
        <label className="form-group">Fish type<select aria-label="Batch fish type" required disabled={!!form.stockEntryId} value={form.fishTypeId} onChange={event => setForm({ ...form, fishTypeId: event.target.value })}><option value="">Select fish</option>{data.fishes.map(fish => <option key={fish.id} value={fish.id}>{fish.name}</option>)}</select></label><label className="form-group">Nursery pond<select aria-label="Nursery pond" required disabled={!!form.stockEntryId} value={form.pondId} onChange={event => setForm({ ...form, pondId: event.target.value })}><option value="">Select pond</option>{data.ponds.filter(pond => pond.status === 'ACTIVE').map(pond => <option key={pond.id} value={pond.id}>{pond.pondName}</option>)}</select></label>
        <label className="form-group">Stocking date<input required type="date" max={today()} readOnly={!!form.stockEntryId} value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label className="form-group">Initial fish count<input required type="number" min="1" max="100000000" step="1" value={form.count} onChange={event => setForm({ ...form, count: event.target.value })} /></label><label className="form-group">Seed purchase cost (₹)<input required type="number" min="0" step="0.01" readOnly={!!form.stockEntryId} value={form.purchaseCost} onChange={event => setForm({ ...form, purchaseCost: event.target.value })} /></label>
        <label className="form-group">Previously incurred growth cost (₹)<input required type="number" min="0" step="0.01" value={form.historicalCost} onChange={event => setForm({ ...form, historicalCost: event.target.value })} /></label><p className="page-desc">For existing stock, enter prior growth costs here without repeating the seed purchase. Past Daily Feed entries are not assigned automatically.</p>
      </> : <>
        <p className="page-desc">{modal.stage.pondName} · {modal.stage.remainingCount} fish remaining. Dates must follow existing stage activity.</p>
        <label className="form-group">Event date<input required type="date" max={today()} min={modal.stage.lastActivityOn || modal.stage.startedOn} value={action.date} onChange={event => field('date', event.target.value)} /></label>
        {!['expenses', 'settlements'].includes(modal.type) && <label className="form-group">Fish count<input required type="number" min="1" max={modal.stage.remainingCount} step="1" value={action.count} onChange={event => field('count', event.target.value)} /></label>}
        {modal.type === 'mortality' && <label className="form-group">Reason<input required maxLength={500} value={action.reason} onChange={event => field('reason', event.target.value)} /></label>}
        {modal.type === 'expenses' && <><label className="form-group">Expense category<select aria-label="Expense category" value={action.category} onChange={event => field('category', event.target.value)}><option value="OTHER">Other</option><option value="MEDICINE">Medicine</option><option value="LABOUR">Labour</option></select></label><label className="form-group">Expense amount (₹)<input required type="number" min="0.01" step="0.01" value={action.amount} onChange={event => field('amount', event.target.value)} /></label><p className="page-desc">Feed expense comes from Daily Feed ticks; do not enter it again here.</p></>}
        {modal.type === 'transfers' && <><label className="form-group">Destination pond<select aria-label="Destination pond" required value={action.targetPondId} onChange={event => field('targetPondId', event.target.value)}><option value="">Select an empty pond</option>{data.ponds.filter(pond => pond.status === 'ACTIVE' && pond.id !== modal.stage.pondId && !detail.stages.some(stage => stage.pondId === pond.id && stage.remainingCount > 0)).map(pond => <option key={pond.id} value={pond.id}>{pond.pondName}</option>)}</select></label><label className="form-group">Transfer cost (₹)<input required type="number" min="0" step="0.01" value={action.transferCost} onChange={event => field('transferCost', event.target.value)} /></label><p className="page-desc">Transferred fish carry a proportionate share of the source cost. Mortality stays in the cost of survivors.</p></>}
        {modal.type === 'settlements' && <><label className="form-group">Additional revenue (₹)<input required type="number" min="0.01" step="0.01" value={action.amount} onChange={event => field('amount', event.target.value)} /></label><p className="page-desc">Enter additional sale revenue only. Do not repeat a settlement already entered. This does not post another harvest or customer invoice.</p></>}
        {modal.type === 'harvests' && <><label className="form-group">Harvest weight (kg)<input required type="number" min="0.001" step="0.001" value={action.weightKg} onChange={event => field('weightKg', event.target.value)} /></label><label className="form-group">Settlement revenue (₹)<input required type="number" min="0" step="0.01" value={action.revenue} onChange={event => field('revenue', event.target.value)} /></label><p className="page-desc">This posts harvested weight to Harvest and Inventory once. Settlement revenue is a batch accounting entry, not a customer invoice; record 0 if not sold yet.</p></>}
        {modal.type !== 'mortality' && <label className="form-group">Notes<input required={modal.type === 'settlements'} maxLength={500} value={action.notes} onChange={event => field('notes', event.target.value)} /></label>}
      </>}
    </fieldset></div><div className="modal-footer"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save batch record'}</button></div></form></div>}
  </div>
}
