import { useState } from 'react'
import { pondApi } from '../api/pondApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function PondsPage() {
  const { data, loading, error, reload } = useData(pondApi.getAll)
  const blank = { pondNumber:'', pondName:'', areaAcres:'', description:'', status:'ACTIVE' }
  const [modal, setModal]   = useState(null)
  const [editing, setEdit]  = useState(null)
  const [form, setForm]     = useState(blank)
  const [saving, setSaving] = useState(false)
  const [fErr, setFErr]     = useState('')
  const [delId, setDelId]   = useState(null)
  const [deling, setDel]    = useState(false)

  const openCreate = () => { setForm(blank); setFErr(''); setModal('create') }
  const openEdit   = p  => {
    setEdit(p)
    setForm({ pondNumber:p.pondNumber, pondName:p.pondName, areaAcres:p.areaAcres||'', description:p.description||'', status:p.status||'ACTIVE' })
    setFErr(''); setModal('edit')
  }
  const save = async () => {
    if (!form.pondNumber.trim() || !form.pondName.trim()) { setFErr('Pond number and name are required!'); return }
    setSaving(true); setFErr('')
    try {
      const payload = { ...form, areaAcres: form.areaAcres ? parseFloat(form.areaAcres) : null }
      modal === 'create' ? await pondApi.create(payload) : await pondApi.update(editing.id, payload)
      reload(); setModal(null)
    } catch(e) { setFErr(e.message) }
    setSaving(false)
  }
  const del = async () => {
    setDel(true)
    try { await pondApi.delete(delId); reload(); setDelId(null) } catch(e) { alert(e.message) }
    setDel(false)
  }

  const activePonds = data?.filter(p => p.status === 'ACTIVE').length || 0
  const totalArea   = data?.reduce((s, p) => s + parseFloat(p.areaAcres || 0), 0) || 0

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">🏊 Ponds</div>
          <div className="page-desc">Manage all ponds on your farm</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Pond</button>
      </div>
      {error && <Alert msg={error}/>}

      <div className="stats-grid">
        <div className="stat-card stat-pond" data-icon="🏊">
          <div className="stat-lbl">Total Ponds</div>
          <div className="stat-val">{data?.length || 0}</div>
          <div className="stat-unit">ponds on the farm</div>
        </div>
        <div className="stat-card stat-green" data-icon="✅">
          <div className="stat-lbl">Active Ponds</div>
          <div className="stat-val">{activePonds}</div>
          <div className="stat-unit">currently active</div>
        </div>
        <div className="stat-card stat-blue" data-icon="📐">
          <div className="stat-lbl">Total Area</div>
          <div className="stat-val">{totalArea.toFixed(1)}</div>
          <div className="stat-unit">acres</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <Loader/> : !data?.length ? (
            <Empty icon="🏊" text="Koi talab nahi hai abhi" sub="Apne farm ke talab add karo — Talab A, Talab B…"/>
          ) : (
            <table>
              <thead>
                <tr><th>Pond No.</th><th>Name</th><th>Area (Acres)</th><th>Description</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id}>
                    <td className="td-main">{p.pondNumber}</td>
                    <td style={{fontWeight:700,fontSize:16}}>{p.pondName}</td>
                    <td className="td-mono">{p.areaAcres ? `${p.areaAcres} ac` : '—'}</td>
                    <td style={{color:'var(--ink3)',fontSize:14,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description || '—'}</td>
                    <td><span className={`badge ${p.status === 'ACTIVE' ? 'badge-green' : 'badge-muted'}`}>{p.status === 'ACTIVE' ? '● Active' : '○ Inactive'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDelId(p.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? '🏊 Add Pond' : '✏️ Edit Pond'}>
        <div className="modal-body">
          <Alert msg={fErr} onClose={() => setFErr('')}/>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Pond Number</label>
              <input placeholder="Example: T-1, POND-A" value={form.pondNumber} onChange={e => setForm({...form, pondNumber:e.target.value})}/>
            </div>
            <div className="form-group">
              <label>Pond Name</label>
              <input placeholder="Example: Main Pond, Pond A" value={form.pondName} onChange={e => setForm({...form, pondName:e.target.value})}/>
            </div>
            <div className="form-group">
              <label>Area (Acres mein)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.areaAcres} onChange={e => setForm({...form, areaAcres:e.target.value})}/>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                <option value="ACTIVE">● Active (Active)</option>
                <option value="INACTIVE">○ Inactive (Inactive)</option>
              </select>
            </div>
            <div className="form-group span2">
              <label>Notes</label>
              <textarea placeholder="Optional notes about this pond…" value={form.description} onChange={e => setForm({...form, description:e.target.value})}/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : '✅ Save'}</button>
        </div>
      </Modal>
      <Confirm open={!!delId} onClose={() => setDelId(null)} onOk={del} loading={deling}/>
    </div>
  )
}
