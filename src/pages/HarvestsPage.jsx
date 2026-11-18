import { useState } from 'react'
import { fishApi } from '../api/fishTypeApi'
import { pondApi } from '../api/pondApi'
import { harvestApi } from '../api/harvestApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'
import { getLocalDate } from '../utils/dates'

export default function HarvestsPage() {
  const { data, loading, error, reload } = useData(harvestApi.getAll)
  const { data: ponds }   = useData(pondApi.getAll)
  const { data: fishes }  = useData(fishApi.getAll)
  const [modal, setModal]   = useState(false)
  const [viewData, setView] = useState(null)
  // const today = new Date().toISOString().slice(0,10)
  const today = getLocalDate()
  const [form, setForm]     = useState({ harvestNumber:'', pondId:'', harvestDate:today, remarks:'' })
  const [items, setItems]   = useState([{ fishTypeId:'', weightKg:'' }])
  const [saving, setSaving] = useState(false)
  const [fErr, setFErr]     = useState('')
  const [delId, setDelId]   = useState(null)
  const [deling, setDel]    = useState(false)

  const genNum = () => `H-${Date.now()}`
  const openCreate = () => {
    setForm({ harvestNumber: genNum(), pondId:'', harvestDate: today, remarks:'' })
    setItems([{ fishTypeId:'', weightKg:'' }])
    setFErr(''); setModal(true)
  }
  const addItem = () => setItems([...items, { fishTypeId:'', weightKg:'' }])
  const remItem = i  => setItems(items.filter((_,idx) => idx !== i))
  const updItem = (i,k,v) => setItems(items.map((it,idx) => idx === i ? {...it,[k]:v} : it))
  const totalKg = arr => arr.reduce((s,it) => s + parseFloat(it.weightKg||0), 0)

  const save = async () => {
    if (!form.pondId || !form.harvestDate) { setFErr('Talab aur date zaroori hai!'); return }
    if (items.some(it => !it.fishTypeId || !it.weightKg)) { setFErr('Har machli ka weight daalo!'); return }
    setSaving(true); setFErr('')
    try {
      await harvestApi.create({
        harvestNumber: form.harvestNumber,
        pondId: parseInt(form.pondId),
        harvestDate: form.harvestDate,
        remarks: form.remarks,
        items: items.map(it => ({ fishTypeId: parseInt(it.fishTypeId), weightKg: parseFloat(it.weightKg) }))
      })
      reload(); setModal(false)
    } catch(e) { setFErr(e.message) }
    setSaving(false)
  }
  const view = async id => {
    try { setView(await harvestApi.getById(id)) } catch(e) { alert(e.message) }
  }
  const del = async () => {
    setDel(true)
    try { await harvestApi.delete(delId); reload(); setDelId(null) } catch(e) { alert(e.message) }
    setDel(false)
  }

  const todayKg = data?.filter(h => h.harvestDate === today).reduce((s,h) => s + totalKg(h.items||[]), 0) || 0

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">🎣 Harvest</div>
          <div className="page-desc">Record fish harvested from a pond</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Harvest</button>
      </div>
      {error && <Alert msg={error}/>}

      <div className="stats-grid">
        <div className="stat-card stat-green" data-icon="🎣">
          <div className="stat-lbl">Harvested Today</div>
          <div className="stat-val">{todayKg.toFixed(0)}</div>
          <div className="stat-unit">kg harvested today</div>
        </div>
        <div className="stat-card stat-pond" data-icon="📋">
          <div className="stat-lbl">Total Records</div>
          <div className="stat-val">{data?.length || 0}</div>
          <div className="stat-unit">harvest records</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <Loader/> : !data?.length ? (
            <Empty icon="🎣" text="No harvest records hai" sub="Jab talab se machli nikalo, tab yahan daalo"/>
          ) : (
            <table>
              <thead>
                <tr><th>Harvest No.</th><th>Talab</th><th>Date</th><th>Fish Types</th><th>Total Weight</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.map(h => (
                  <tr key={h.id}>
                    <td className="td-mono">{h.harvestNumber}</td>
                    <td className="td-main">{h.pondName || h.pond?.pondName || '—'}</td>
                    <td className="td-mono">{h.harvestDate}</td>
                    <td>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        {(h.items||[]).map((it,i) => (
                          <span key={i} className="badge badge-blue">{it.fishTypeName || it.fishType?.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="td-green">{totalKg(h.items||[]).toFixed(2)} kg</td>
                    <td>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => view(h.id)}>👁 View</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDelId(h.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title="🎣 Add Harvest" size="modal-lg">
        <div className="modal-body">
          <Alert msg={fErr} onClose={() => setFErr('')}/>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Select Pond</label>
              <select value={form.pondId} onChange={e => setForm({...form, pondId:e.target.value})}>
                <option value="">— Select pond —</option>
                {(ponds||[]).map(p => <option key={p.id} value={p.id}>{p.pondNumber} — {p.pondName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Katai ki Date</label>
              <input type="date" value={form.harvestDate} onChange={e => setForm({...form, harvestDate:e.target.value})}/>
            </div>
            <div className="form-group span2">
              <label>Notes (Optional)</label>
              <input placeholder="Optional notes…" value={form.remarks} onChange={e => setForm({...form, remarks:e.target.value})}/>
            </div>
          </div>

          <div className="divider"/>
          <div className="section-title">
            Fish & Weight
            <button className="btn btn-ghost btn-xs" onClick={addItem}>+ Add Another Fish</button>
          </div>

          <div className="item-rows">
            {items.map((item, i) => (
              <div className="item-row" key={i}>
                <div style={{flex:2}}>
                  <select value={item.fishTypeId} onChange={e => updItem(i,'fishTypeId',e.target.value)}>
                    <option value="">— Select fish —</option>
                    {(fishes||[]).filter(f => f.active !== false).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <input type="number" step="0.01" placeholder="Weight (kg)" value={item.weightKg}
                    onChange={e => updItem(i,'weightKg',e.target.value)}/>
                </div>
                {items.length > 1 && (
                  <button className="rm" onClick={() => remItem(i)}>×</button>
                )}
              </div>
            ))}
          </div>

          <div className="total-band" style={{marginTop:18}}>
            <div>
              <div className="total-band-label">TOTAL WEIGHT</div>
              <div className="total-band-sub">{items.length} fish types</div>
            </div>
            <div className="total-band-val">{totalKg(items).toFixed(2)} kg</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : '✅ Save Harvest'}</button>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal open={!!viewData} onClose={() => setView(null)} title={viewData ? `🎣 ${viewData.harvestNumber}` : ''}>
        {viewData && (
          <>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item"><div className="info-lbl">Talab</div><div className="info-val">{viewData.pondName || viewData.pond?.pondName}</div></div>
                <div className="info-item"><div className="info-lbl">Date</div><div className="info-val">{viewData.harvestDate}</div></div>
              </div>
              {viewData.remarks && (
                <div className="info-item" style={{marginBottom:16}}><div className="info-lbl">Note</div><div className="info-val">{viewData.remarks}</div></div>
              )}
              <table>
                <thead><tr><th>Machli</th><th>Wajan</th></tr></thead>
                <tbody>
                  {(viewData.items||[]).map((it,i) => (
                    <tr key={i}>
                      <td className="td-main">{it.fishTypeName || it.fishType?.name}</td>
                      <td className="td-green">{it.weightKg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="total-band" style={{marginTop:16}}>
                <div className="total-band-label">TOTAL WEIGHT</div>
                <div className="total-band-val">{totalKg(viewData.items||[]).toFixed(2)} kg</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setView(null)}>Close</button>
            </div>
          </>
        )}
      </Modal>
      <Confirm open={!!delId} onClose={() => setDelId(null)} onOk={del} loading={deling}/>
    </div>
  )
}
