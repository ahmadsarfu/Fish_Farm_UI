import { useState } from 'react'
import { fishApi } from '../api/fishTypeApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function FishTypesPage() {
  const { data, loading, error, reload } = useData(fishApi.getAll)
  const [modal, setModal]   = useState(null)
  const [editing, setEdit]  = useState(null)
  const [form, setForm]     = useState({ name:'' })
  const [saving, setSaving] = useState(false)
  const [fErr, setFErr]     = useState('')
  const [delId, setDelId]   = useState(null)
  const [deling, setDel]    = useState(false)

  const openCreate = () => { setForm({ name:'' }); setFErr(''); setModal('create') }
  const openEdit   = ft  => { setEdit(ft); setForm({ name:ft.name, active:ft.active !== false }); setFErr(''); setModal('edit') }

  const save = async () => {
    if (!form.name.trim()) { setFErr('Machli ka naam zaroori hai!'); return }
    setSaving(true); setFErr('')
    try {
      modal === 'create'
        ? await fishApi.create({ name: form.name.trim() })
        : await fishApi.update(editing.id, { name: form.name.trim(), active: form.active })
      reload(); setModal(null)
    } catch(e) { setFErr(e.message) }
    setSaving(false)
  }
  const del = async () => {
    setDel(true)
    try { await fishApi.delete(delId); reload(); setDelId(null) } catch(e) { alert(e.message) }
    setDel(false)
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">🐟 Fish Types</div>
          <div className="page-desc">Manage fish types available on your farm</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Fish Type</button>
      </div>
      {error && <Alert msg={error}/>}
      <div className="card">
        <div className="table-wrap">
          {loading ? <Loader/> : !data?.length ? (
            <Empty icon="🐠" text="No fish added yet" sub="Start by adding fish"/>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fish Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((ft, i) => (
                  <tr key={ft.id}>
                    <td className="td-mono">{i + 1}</td>
                    <td className="td-main">{ft.name}</td>
                    <td>
                      <span className={`badge ${ft.active !== false ? 'badge-green' : 'badge-red'}`}>
                        {ft.active !== false ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ft)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDelId(ft.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? '🐟 Add Fish Type' : '✏️ Edit Fish Type'}>
        <div className="modal-body">
          <Alert msg={fErr} onClose={() => setFErr('')}/>
          <div className="form-grid">
            <div className="form-group">
              <label>Fish Name</label>
              <input placeholder="Example: Rohu, Baikhi, Paplet, Katla…" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && save()} autoFocus/>
            </div>
            {modal === 'edit' && (
              <div className="form-group">
                <label>Status</label>
                <select value={form.active ? 'true' : 'false'} onChange={e => setForm({...form, active: e.target.value === 'true'})}>
                  <option value="true">● Active (Active)</option>
                  <option value="false">○ Inactive (Inactive)</option>
                </select>
              </div>
            )}
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
