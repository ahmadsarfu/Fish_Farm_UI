import { useState, useEffect, useCallback, useRef } from 'react'
import { generateDispatchInvoice } from './components/invoice/dispatchInvoice'
import FeedManagementPage from './components/FeedManagementPage'


// ═══ API CLIENT ══════════════════════════════════════════════════════════════
 const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
// const BASE = 'https://placed-graduate-amy-welding.trycloudflare.com'
// const BASE = 'https://string-limitations-forms-tell.trycloudflare.com'
async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.message || e.error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ═══ DATE HELPERS ═════════════════════════════════════════════════════════════
const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getLocalMonth = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

const fishApi = {
  getAll:  ()      => req('/api/fish-types'),
  create:  (d)     => req('/api/fish-types', { method:'POST', body:JSON.stringify(d) }),
  update:  (id, d) => req(`/api/fish-types/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  delete:  (id)    => req(`/api/fish-types/${id}`, { method:'DELETE' }),
}
const pondApi = {
  getAll:  ()      => req('/api/ponds'),
  create:  (d)     => req('/api/ponds', { method:'POST', body:JSON.stringify(d) }),
  update:  (id, d) => req(`/api/ponds/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  delete:  (id)    => req(`/api/ponds/${id}`, { method:'DELETE' }),
}
const harvestApi = {
  getAll:  ()   => req('/api/harvests'),
  getById: (id) => req(`/api/harvests/${id}`),
  create:  (d)  => req('/api/harvests', { method:'POST', body:JSON.stringify(d) }),
  delete:  (id) => req(`/api/harvests/${id}`, { method:'DELETE' }),
}
const invApi = {
  getAll: () => req('/api/inventory'),
}
const dispatchApi = {
  getAll:  ()   => req('/api/dispatches'),
  getById: (id) => req(`/api/dispatches/${id}`),
  create:  (d)  => req('/api/dispatches', { method:'POST', body:JSON.stringify(d) }),
   markAsDispatched: (id) =>req(`/api/dispatches/${id}/dispatch`, { method: 'PUT'}),
  delete:  (id) => req(`/api/dispatches/${id}`, { method:'DELETE' }),
}
const salesApi = {getHistory: () => req('/api/sales/history'),
}
const sessionApi = {
  create: (d)  => req('/api/weighing-sessions', { method:'POST', body:JSON.stringify(d) }),
  close:  (id, body) => req(`/api/weighing-sessions/${id}/close`, { method:'PUT', body:JSON.stringify(body) }),
  getAll: ()   => req('/api/weighing-sessions'),
}
const weightApi = {
  getBySession: (sid) => req(`/api/weight-entries/session/${sid}`),
  create:       (d)   => req('/api/weight-entries', { method:'POST', body:JSON.stringify(d) }),
  delete:       (id)  => req(`/api/weight-entries/${id}`, { method:'DELETE' }),
}

const customerApi = {
  getAll: () => req('/api/customers'),

  create: (d) =>
    req('/api/customers', {
      method: 'POST',
      body: JSON.stringify(d)
    }),

  update: (id, d) =>
    req(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(d)
    }),

  delete: (id) =>
    req(`/api/customers/${id}`, {
      method: 'DELETE'
    }),
}

const fishStockApi = {
  getAll: () => req('/api/fish-stock'),

  create: (d) =>
    req('/api/fish-stock', {
      method:'POST',
      body:JSON.stringify(d)
    }),

  update: (id, d) =>
    req(`/api/fish-stock/${id}`, {
      method:'PUT',
      body:JSON.stringify(d)
    }),

  delete: (id) =>
    req(`/api/fish-stock/${id}`, {
      method:'DELETE'
    }),
}

// ═══ HOOKS ════════════════════════════════════════════════════════════════════
function useData(fn, deps = []) {
  const [data, setData]   = useState(null)
  const [loading, setL]   = useState(true)
  const [error, setErr]   = useState(null)
  const load = useCallback(async () => {
    setL(true); setErr(null)
    try { setData(await fn()) } catch(e) { setErr(e.message) }
    finally { setL(false) }
  }, deps) // eslint-disable-line
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

// ═══ SHARED UI ════════════════════════════════════════════════════════════════
function Loader() {
  return <div className="loading"><div className="spinner"/>Loading...</div>
}
function Empty({ icon='📭', text, sub }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <div className="empty-text">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  )
}
function Alert({ type='error', msg, onClose }) {
  if (!msg) return null
  const icons = { error:'⚠️', success:'✅', info:'ℹ️' }
  return (
    <div className={`alert alert-${type}`}>
      <span>{icons[type]}</span>
      <span style={{flex:1}}>{msg}</span>
      {onClose && <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:16,fontWeight:700}}>✕</button>}
    </div>
  )
}
function Modal({ open, onClose, title, children, size='' }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-hdr">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Confirm({ open, onClose, onOk, loading, title='Delete this record?', msg }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="modal-body">
        <p style={{fontSize:16,color:'var(--ink2)',lineHeight:1.6}}>
          {msg || 'This record will be permanently deleted. Are you sure?'}
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={onOk} disabled={loading}>{loading ? 'Deleting...' : '🗑 Delete'}</button>
      </div>
    </Modal>
  )
}

// ═══ FISH TYPES PAGE ═══════════════════════════════════════════════════════════
function FishTypesPage() {
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

// ═══ PONDS PAGE ════════════════════════════════════════════════════════════════
function PondsPage() {
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

// ═══ CUSTOMERS PAGE ════════════════════════════════════════════════════════════
function CustomersPage({ onNav, onCustomerDispatch }) {

  const {
    data,
    loading,
    error,
    reload
  } = useData(customerApi.getAll)

  const blank = {
    name:'',
    mobile:'',
    address:'',
    gstNumber:'',
    customerType:'RETAIL'
  }

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)

  const [saving, setSaving] = useState(false)
  const [fErr, setFErr] = useState('')

  const [delId, setDelId] = useState(null)
  const [deleting, setDeleting] = useState(false)


  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setFErr('')
    setModal('create')
  }


  const openEdit = customer => {

    setEditing(customer)

    setForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      address: customer.address || '',
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType || 'RETAIL'
    })

    setFErr('')
    setModal('edit')
  }


  const save = async () => {

    if (!form.name.trim()) {
      setFErr('Customer name is required')
      return
    }

    if (
      form.mobile &&
      !/^\d{10}$/.test(form.mobile.trim())
    ) {
      setFErr('Enter a valid 10 digit mobile number')
      return
    }

    setSaving(true)
    setFErr('')

    try {

      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        address: form.address.trim() || null,
        gstNumber: form.gstNumber.trim() || null,
        customerType: form.customerType
      }

      if (modal === 'create') {
        await customerApi.create(payload)
      } else {
        await customerApi.update(editing.id, payload)
      }

      await reload()
      setModal(null)

    } catch(e) {
      setFErr(e.message)
    }

    setSaving(false)
  }


  const remove = async () => {

    setDeleting(true)

    try {

      await customerApi.delete(delId)

      await reload()
      setDelId(null)

    } catch(e) {
      alert(e.message)
    }

    setDeleting(false)
  }


  const filteredCustomers = (data || []).filter(customer => {

    const q = search.trim().toLowerCase()

    if (!q) return true

    return (
      customer.name?.toLowerCase().includes(q) ||
      customer.mobile?.toLowerCase().includes(q) ||
      customer.gstNumber?.toLowerCase().includes(q) ||
      customer.customerType?.toLowerCase().includes(q) ||
      customer.address?.toLowerCase().includes(q)
    )
  })


  const retailCount =
    (data || []).filter(
      c => c.customerType === 'RETAIL'
    ).length

  const wholesaleCount =
    (data || []).filter(
      c => c.customerType === 'WHOLESALE'
    ).length


  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-hdr">

        <div>
          <div className="page-title">
            👥 Customers
          </div>

          <div className="page-desc">
            Register and manage your customers
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={openCreate}
        >
          + New Customer
        </button>

      </div>


      {error && <Alert msg={error}/>}


      {/* SUMMARY */}
      <div className="stats-grid">

        <div
          className="stat-card stat-blue"
          data-icon="👥"
        >
          <div className="stat-lbl">
            Total Customers
          </div>

          <div className="stat-val">
            {data?.length || 0}
          </div>

          <div className="stat-unit">
            registered customers
          </div>
        </div>


        <div
          className="stat-card stat-green"
          data-icon="🏪"
        >
          <div className="stat-lbl">
            Wholesale
          </div>

          <div className="stat-val">
            {wholesaleCount}
          </div>

          <div className="stat-unit">
            wholesale customers
          </div>
        </div>


        <div
          className="stat-card stat-pond"
          data-icon="🛒"
        >
          <div className="stat-lbl">
            Retail
          </div>

          <div className="stat-val">
            {retailCount}
          </div>

          <div className="stat-unit">
            retail customers
          </div>
        </div>

      </div>


      {/* CUSTOMER LIST */}
      <div className="card">

        <div className="card-hdr">

          <div>
            <div className="card-title">
              👥 Customer Records
            </div>

            <div className="card-sub">
              Search customers by name, mobile or GST number
            </div>
          </div>


          <div style={{
            width:320,
            maxWidth:'100%'
          }}>
            <input
              type="text"
              placeholder="🔍 Search name, mobile, GST..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

        </div>


        <div className="table-wrap">

          {loading ? (

            <Loader/>

          ) : filteredCustomers.length === 0 ? (

            <Empty
              icon="👤"
              text={
                search
                  ? 'No matching customer found'
                  : 'No customers registered yet'
              }
              sub={
                search
                  ? 'Try another name or mobile number'
                  : 'Register your first customer'
              }
            />

          ) : (

            <table>

              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>GST Number</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>


              <tbody>

                {filteredCustomers.map((customer, index) => (

                  <tr key={customer.id}>

                    <td className="td-mono">
                      {index + 1}
                    </td>


                    <td>
                      <div
                        style={{
                          fontWeight:800,
                          fontSize:15
                        }}
                      >
                        {customer.name}
                      </div>
                    </td>


                    <td className="td-mono">
                      {customer.mobile || '—'}
                    </td>


                    <td>
                      <span
                        className={`badge ${
                          customer.customerType === 'WHOLESALE'
                            ? 'badge-blue'
                            : 'badge-green'
                        }`}
                      >
                        {customer.customerType === 'WHOLESALE'
                          ? '🏪 Wholesale'
                          : '🛒 Retail'}
                      </span>
                    </td>


                    <td className="td-mono">
                      {customer.gstNumber || '—'}
                    </td>


                    <td
                      style={{
                        color:'var(--ink3)',
                        maxWidth:220
                      }}
                    >
                      {customer.address || '—'}
                    </td>


                    <td>

                      <div style={{
                        display:'flex',
                        gap:7,
                        flexWrap:'wrap'
                      }}>

                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(customer)}
                        >
                          ✏️ Edit
                        </button>


                        <button
  className="btn btn-primary btn-sm"
  onClick={() => onCustomerDispatch(customer)}
>
  🚛 Dispatch
</button>


                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDelId(customer.id)}
                        >
                          🗑
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>


      {/* CREATE / EDIT MODAL */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal === 'create'
            ? '👤 Register Customer'
            : '✏️ Edit Customer'
        }
      >

        <div className="modal-body">

          <Alert
            msg={fErr}
            onClose={() => setFErr('')}
          />


          <div className="form-grid form-grid-2">

            <div className="form-group span2">
              <label>Customer Name *</label>

              <input
                placeholder="Example: Mukesh Fish Traders"
                value={form.name}
                onChange={e =>
                  setForm({
                    ...form,
                    name:e.target.value
                  })
                }
                autoFocus
              />
            </div>


            <div className="form-group">
              <label>Mobile Number</label>

              <input
                type="tel"
                maxLength={10}
                placeholder="Example: 9876543210"
                value={form.mobile}
                onChange={e =>
                  setForm({
                    ...form,
                    mobile:e.target.value.replace(/\D/g,'')
                  })
                }
              />
            </div>


            <div className="form-group">
              <label>Customer Type</label>

              <select
                value={form.customerType}
                onChange={e =>
                  setForm({
                    ...form,
                    customerType:e.target.value
                  })
                }
              >
                <option value="RETAIL">
                  Retail
                </option>

                <option value="WHOLESALE">
                  Wholesale
                </option>
              </select>
            </div>


            <div className="form-group span2">
              <label>GST Number</label>

              <input
                maxLength={15}
                placeholder="Optional"
                value={form.gstNumber}
                onChange={e =>
                  setForm({
                    ...form,
                    gstNumber:e.target.value.toUpperCase()
                  })
                }
              />
            </div>


            <div className="form-group span2">
              <label>Address</label>

              <textarea
                placeholder="Customer address (optional)"
                value={form.address}
                onChange={e =>
                  setForm({
                    ...form,
                    address:e.target.value
                  })
                }
              />
            </div>

          </div>

        </div>


        <div className="modal-footer">

          <button
            className="btn btn-ghost"
            onClick={() => setModal(null)}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : modal === 'create'
                ? '✅ Register Customer'
                : '✅ Save Changes'}
          </button>

        </div>

      </Modal>


      {/* DELETE CONFIRMATION */}
      <Confirm
        open={!!delId}
        onClose={() => setDelId(null)}
        onOk={remove}
        loading={deleting}
        title="Remove this customer?"
        msg="The customer will be deactivated. Existing dispatch and sales history will remain available."
      />

    </div>
  )
}
// ═══ HARVESTS PAGE ══════════════════════════════════════════════════════════════
function HarvestsPage() {
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

// ═══ INVENTORY PAGE ════════════════════════════════════════════════════════════
// function InventoryPage() {
//   const { data, loading, error, reload } = useData(invApi.getAll)
//   const total   = data?.reduce((s,i) => s + parseFloat(i.currentStockKg||0), 0) || 0
//   const inStock = data?.filter(i => parseFloat(i.currentStockKg) > 0).length || 0

//   return (
//     <div className="page">
//       <div className="page-hdr">
//         <div>
//           <div className="page-title">📦 Stock (Inventory)</div>
//           <div className="page-desc">View current fish stock — updated automatically</div>
//         </div>
//         <button className="btn btn-ghost" onClick={reload}>↻ Refresh</button>
//       </div>
//       {error && <Alert msg={error}/>}

//       <div className="stats-grid">
//         <div className="stat-card stat-green" data-icon="📦">
//           <div className="stat-lbl">Total Stock</div>
//           <div className="stat-val">{total.toFixed(0)}</div>
//           <div className="stat-unit">kg currently available</div>
//         </div>
//         <div className="stat-card stat-pond" data-icon="🐟">
//           <div className="stat-lbl">In Stock</div>
//           <div className="stat-val">{inStock}</div>
//           <div className="stat-unit">fish types available</div>
//         </div>
//         <div className="stat-card stat-amber" data-icon="⚠️">
//           <div className="stat-lbl">Out of Stock</div>
//           <div className="stat-val">{(data?.length||0) - inStock}</div>
//           <div className="stat-unit">fish types with zero stock</div>
//         </div>
//       </div>

//       <div className="card">
//         <div className="card-hdr">
//           <div>
//             <div className="card-title">📊 Fish Stock</div>
//             <div className="card-sub">Stock increases after harvest and decreases after dispatch</div>
//           </div>
//         </div>
//         <div className="table-wrap">
//           {loading ? <Loader/> : !data?.length ? (
//             <Empty icon="📦" text="No stock data available" sub="Record a harvest first"/>
//           ) : (
//             <table>
//               <thead>
//                 <tr><th>Fish Name</th><th>Available Stock</th><th>Share (%)</th><th>Last Updated</th><th>Status</th></tr>
//               </thead>
//               <tbody>
//                 {data.map(inv => {
//                   const stock = parseFloat(inv.currentStockKg || 0)
//                   const pct   = total > 0 ? (stock / total * 100).toFixed(1) : 0
//                   return (
//                     <tr key={inv.fishTypeId || inv.id}>
//                       <td className="td-main">{inv.fishTypeName}</td>
//                       <td>
//                         <span style={{fontFamily:'var(--mono)',fontSize:22,fontWeight:900,color:stock>0?'var(--pond-light)':'var(--ink4)'}}>
//                           {stock.toFixed(2)}
//                         </span>
//                         <span style={{color:'var(--ink3)',fontSize:14,marginLeft:5,fontWeight:600}}> kg</span>
//                       </td>
//                       <td>
//                         <div style={{display:'flex',alignItems:'center',gap:10}}>
//                           <div style={{width:90,height:8,background:'var(--border)',borderRadius:4}}>
//                             <div style={{height:'100%',background:'var(--pond-light)',borderRadius:4,width:`${pct}%`,transition:'width .4s'}}/>
//                           </div>
//                           <span style={{fontSize:13,fontFamily:'var(--mono)',color:'var(--ink3)',fontWeight:600}}>{pct}%</span>
//                         </div>
//                       </td>
//                       <td className="td-mono">{inv.lastUpdated ? new Date(inv.lastUpdated).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
//                       <td>
//                         <span className={`badge ${stock > 100 ? 'badge-green' : stock > 0 ? 'badge-amber' : 'badge-red'}`}>
//                           {stock > 100 ? '✅ Good' : stock > 0 ? '⚠️ Low Stock' : '❌ Out of Stock'}
//                         </span>
//                       </td>
//                     </tr>
//                   )
//                 })}
//               </tbody>
//             </table>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

function InventoryPage() {

  const {
    data,
    loading,
    error,
    reload
  } = useData(fishStockApi.getAll)

  const { data: fishes } = useData(fishApi.getAll)
  const { data: ponds } = useData(pondApi.getAll)

  const today = getLocalDate()

  const blank = {
    fishTypeId:'',
    pondId:'',
    stockDate:today,
    sizeFromGram:'',
    sizeToGram:'',
    quantity:'',
    purchaseAmount:'',
    supplierName:'',
    remarks:''
  }

  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)

  const [saving, setSaving] = useState(false)
  const [fErr, setFErr] = useState('')

  const [delId, setDelId] = useState(null)
  const [deleting, setDeleting] = useState(false)


  const totalInvestment = (data || []).reduce(
    (sum, item) =>
      sum + Number(item.purchaseAmount || 0),
    0
  )

  const totalQuantity = (data || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  )


  const openCreate = () => {
    setEditing(null)
    setForm({
      ...blank,
      stockDate:getLocalDate()
    })
    setFErr('')
    setModal('create')
  }


  const openEdit = item => {

    setEditing(item)

    setForm({
      fishTypeId:String(item.fishTypeId || ''),
      pondId:String(item.pondId || ''),
      stockDate:item.stockDate || today,
      sizeFromGram:item.sizeFromGram ?? '',
      sizeToGram:item.sizeToGram ?? '',
      quantity:item.quantity ?? '',
      purchaseAmount:item.purchaseAmount ?? '',
      supplierName:item.supplierName || '',
      remarks:item.remarks || ''
    })

    setFErr('')
    setModal('edit')
  }


  const save = async () => {

    if (!form.fishTypeId) {
      setFErr('Please select fish type')
      return
    }

    if (!form.pondId) {
      setFErr('Please select pond')
      return
    }

    if (!form.stockDate) {
      setFErr('Stock date is required')
      return
    }

    if (
      form.purchaseAmount === '' ||
      Number(form.purchaseAmount) < 0
    ) {
      setFErr('Enter valid purchase amount')
      return
    }

    if (
      form.sizeFromGram !== '' &&
      form.sizeToGram !== '' &&
      Number(form.sizeFromGram) > Number(form.sizeToGram)
    ) {
      setFErr('Starting size from cannot be greater than size to')
      return
    }

    setSaving(true)
    setFErr('')

    try {

      const payload = {
        fishTypeId:Number(form.fishTypeId),
        pondId:Number(form.pondId),
        stockDate:form.stockDate,

        sizeFromGram:
          form.sizeFromGram === ''
            ? null
            : Number(form.sizeFromGram),

        sizeToGram:
          form.sizeToGram === ''
            ? null
            : Number(form.sizeToGram),

        quantity:
          form.quantity === ''
            ? null
            : Number(form.quantity),

        purchaseAmount:Number(form.purchaseAmount),

        supplierName:
          form.supplierName.trim() || null,

        remarks:
          form.remarks.trim() || null
      }

      if (modal === 'create') {
        await fishStockApi.create(payload)
      } else {
        await fishStockApi.update(editing.id, payload)
      }

      await reload()
      setModal(null)

    } catch(e) {
      setFErr(e.message)
    }

    setSaving(false)
  }


  const remove = async () => {

    setDeleting(true)

    try {

      await fishStockApi.delete(delId)

      await reload()
      setDelId(null)

    } catch(e) {
      alert(e.message)
    }

    setDeleting(false)
  }


  const money = value =>
    Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits:2,
      maximumFractionDigits:2
    })


  return (
    <div className="page">

      <div className="page-hdr">

        <div>
          <div className="page-title">
            📦 Fish Stock Register
          </div>

          <div className="page-desc">
            Record fish stocking, starting size and purchase cost
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={openCreate}
        >
          + Add Stock Entry
        </button>

      </div>


      {error && <Alert msg={error}/>}


      <div className="stats-grid">

        <div
          className="stat-card stat-green"
          data-icon="₹"
        >
          <div className="stat-lbl">
            Total Investment
          </div>

          <div
            className="stat-val"
            style={{fontSize:27}}
          >
            ₹{money(totalInvestment)}
          </div>

          <div className="stat-unit">
            fish purchase cost
          </div>
        </div>


        <div
          className="stat-card stat-blue"
          data-icon="📋"
        >
          <div className="stat-lbl">
            Stock Entries
          </div>

          <div className="stat-val">
            {data?.length || 0}
          </div>

          <div className="stat-unit">
            stocking records
          </div>
        </div>


        <div
          className="stat-card stat-pond"
          data-icon="🐟"
        >
          <div className="stat-lbl">
            Fish Quantity
          </div>

          <div className="stat-val">
            {totalQuantity.toLocaleString('en-IN')}
          </div>

          <div className="stat-unit">
            recorded fish count
          </div>
        </div>

      </div>


      <div className="card">

        <div className="card-hdr">

          <div>
            <div className="card-title">
              🐟 Stocking History
            </div>

            <div className="card-sub">
              Fish introduced into ponds and their purchase cost
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={reload}
          >
            ↻ Refresh
          </button>

        </div>


        <div className="table-wrap">

          {loading ? (

            <Loader/>

          ) : !data?.length ? (

            <Empty
              icon="📦"
              text="No fish stock entries yet"
              sub="Add your first fish stocking record"
            />

          ) : (

            <table>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pond</th>
                  <th>Fish Type</th>
                  <th>Starting Size</th>
                  <th>Quantity</th>
                  <th>Purchase Amount</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {data.map(item => (

                  <tr key={item.id}>

                    <td className="td-mono">
                      {item.stockDate}
                    </td>

                    <td>
                      <div style={{fontWeight:700}}>
                        {item.pondNumber || ''}
                        {item.pondNumber && item.pondName
                          ? ' — '
                          : ''}
                        {item.pondName}
                      </div>
                    </td>

                    <td className="td-main">
                      {item.fishTypeName}
                    </td>

                    <td className="td-mono">

                      {item.sizeFromGram != null &&
                       item.sizeToGram != null

                        ? `${item.sizeFromGram} - ${item.sizeToGram} gm`

                        : item.sizeFromGram != null

                          ? `${item.sizeFromGram} gm`

                          : item.sizeToGram != null

                            ? `Up to ${item.sizeToGram} gm`

                            : '—'
                      }

                    </td>

                    <td className="td-mono">
                      {item.quantity != null
                        ? Number(item.quantity)
                            .toLocaleString('en-IN')
                        : '—'}
                    </td>

                    <td
                      style={{
                        fontWeight:800,
                        color:'var(--pond-light)'
                      }}
                    >
                      ₹{money(item.purchaseAmount)}
                    </td>

                    <td>
                      {item.supplierName || '—'}
                    </td>

                    <td>

                      <div style={{
                        display:'flex',
                        gap:7
                      }}>

                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(item)}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDelId(item.id)}
                        >
                          🗑
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>
      </div>


      {/* CREATE / EDIT */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal === 'create'
            ? '📦 Add Fish Stock'
            : '✏️ Edit Fish Stock'
        }
        size="modal-lg"
      >

        <div className="modal-body">

          <Alert
            msg={fErr}
            onClose={() => setFErr('')}
          />


          <div className="form-grid form-grid-2">

            <div className="form-group">
              <label>Fish Type *</label>

              <select
                value={form.fishTypeId}
                onChange={e =>
                  setForm({
                    ...form,
                    fishTypeId:e.target.value
                  })
                }
              >
                <option value="">
                  — Select fish —
                </option>

                {(fishes || [])
                  .filter(f => f.active !== false)
                  .map(f => (
                    <option
                      key={f.id}
                      value={f.id}
                    >
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>


            <div className="form-group">
              <label>Pond *</label>

              <select
                value={form.pondId}
                onChange={e =>
                  setForm({
                    ...form,
                    pondId:e.target.value
                  })
                }
              >
                <option value="">
                  — Select pond —
                </option>

                {(ponds || [])
                  .filter(p => p.status === 'ACTIVE')
                  .map(p => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.pondNumber} — {p.pondName}
                    </option>
                  ))}
              </select>
            </div>


            <div className="form-group">
              <label>Stock Date *</label>

              <input
                type="date"
                value={form.stockDate}
                onChange={e =>
                  setForm({
                    ...form,
                    stockDate:e.target.value
                  })
                }
              />
            </div>


            <div className="form-group">
              <label>Fish Quantity</label>

              <input
                type="number"
                min="0"
                step="1"
                placeholder="Example: 10000"
                value={form.quantity}
                onChange={e =>
                  setForm({
                    ...form,
                    quantity:e.target.value
                  })
                }
              />
            </div>


            <div className="form-group">
              <label>Starting Size From (gm)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 50"
                value={form.sizeFromGram}
                onChange={e =>
                  setForm({
                    ...form,
                    sizeFromGram:e.target.value
                  })
                }
              />
            </div>


            <div className="form-group">
              <label>Starting Size To (gm)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 80"
                value={form.sizeToGram}
                onChange={e =>
                  setForm({
                    ...form,
                    sizeToGram:e.target.value
                  })
                }
              />
            </div>


            <div className="form-group">
              <label>Purchase Amount (₹) *</label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 35000"
                value={form.purchaseAmount}
                onChange={e =>
                  setForm({
                    ...form,
                    purchaseAmount:e.target.value
                  })
                }
              />
            </div>


            <div className="form-group">
              <label>Supplier</label>

              <input
                placeholder="Example: ABC Hatchery"
                value={form.supplierName}
                onChange={e =>
                  setForm({
                    ...form,
                    supplierName:e.target.value
                  })
                }
              />
            </div>


            <div className="form-group span2">
              <label>Remarks</label>

              <textarea
                placeholder="Optional notes..."
                value={form.remarks}
                onChange={e =>
                  setForm({
                    ...form,
                    remarks:e.target.value
                  })
                }
              />
            </div>

          </div>

        </div>


        <div className="modal-footer">

          <button
            className="btn btn-ghost"
            onClick={() => setModal(null)}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : modal === 'create'
                ? '✅ Save Stock Entry'
                : '✅ Save Changes'}
          </button>

        </div>

      </Modal>


      <Confirm
        open={!!delId}
        onClose={() => setDelId(null)}
        onOk={remove}
        loading={deleting}
        title="Delete this stock entry?"
        msg="This stocking record will be removed from the active stock history."
      />

    </div>
  )
}

// ═══ DISPATCH DETAIL (basket weighing inside) ════════════════════════════════
function DispatchDetail({ dispatch, onClose, fishTypes,ponds }) {
  const [activeTab, setTab]     = useState('loading')
  const [sessions, setSessions] = useState([])
  const [loadingS, setLoadingS] = useState(true)
  const [selFish, setSelFish]   = useState('')
  const [selPond, setSelPond] = useState('')
  const [creating, setCreating] = useState(false)
  const [dispatching, setDispatching] = useState(false)

  const [closeModal, setCloseModal]     = useState(false)
  const [deductionPct, setDeductionPct] = useState(3)
  const [rate, setRate]                 = useState('')
  const [closing, setClosing]           = useState(false)

  const [activeSession, setActiveSession] = useState(null)
  const [entries, setEntries]             = useState([])
  const [loadingE, setLoadingE]           = useState(false)
  const [weight, setWeight]               = useState('')
  const [remarks, setRemarks]             = useState('')
  const [adding, setAdding]               = useState(false)
  const [wErr, setWErr]                   = useState('')
  const inputRef = useRef(null)

  const STATUS_STEPS = ['CREATED','LOADING','DISPATCHED','RETURNED','CLOSED']

  const loadSessions = useCallback(async () => {
    setLoadingS(true)
    try {
      const all = await sessionApi.getAll()
      setSessions((all||[]).filter(s => s.dispatchId === dispatch.id || s.dispatch?.id === dispatch.id))
    } catch(e) { console.error(e) }
    setLoadingS(false)
  }, [dispatch.id])

  useEffect(() => { loadSessions() }, [loadSessions])

  const loadEntries = useCallback(async (sessionId) => {
    setLoadingE(true)
    try { setEntries(await weightApi.getBySession(sessionId) || []) } catch(e) {}
    setLoadingE(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const openSession = async (session) => {
    setActiveSession(session)
    await loadEntries(session.id)
  }

  const createSession = async () => {
    if (!selFish || !selPond) return
    setCreating(true)
    try {
      const s = await sessionApi.create({ dispatchId: dispatch.id, fishTypeId: parseInt(selFish),pondId: parseInt(selPond), sessionLabel: fishTypes.find(f=>f.id===parseInt(selFish))?.name + ' — Loading' })
      await loadSessions()
      setSelFish('')
       setSelPond('')
      await openSession(s)
    } catch(e) { alert(e.message) }
    setCreating(false)
  }

  const addBasket = async () => {
    const w = parseFloat(weight)
    if (!w || w <= 0) { setWErr('Enter a valid weight greater than 0'); return }
    setAdding(true); setWErr('')
    try {
      await weightApi.create({ sessionId: activeSession.id, weightKg: w, remarks: remarks || null, basketNumber: entries.length + 1 })
      setWeight(''); setRemarks('')
      await loadEntries(activeSession.id)
    } catch(e) { setWErr(e.message) }
    setAdding(false)
    inputRef.current?.focus()
  }

  const delBasket = async (id) => {
    try { await weightApi.delete(id); await loadEntries(activeSession.id) } catch(e) { alert(e.message) }
  }

  const sessionTotal = entries.reduce((s,e) => s + parseFloat(e.weightKg||0), 0)

  const openCloseModal = () => { setDeductionPct(3); setRate(''); setCloseModal(true) }

  const buildWhatsAppLink = () => {
  const closedSessions = sessions.filter(
    s => s.closed || s.isClosed
  )

  if (closedSessions.length === 0) return null

  let totalWeight = 0
  let grandTotal = 0

  const lines = []

  lines.push(`*MUSHTAQUE FISH TRADERS*`)
  lines.push(`_*WHOLESALE & RETAIL FRESH SEAFOOD*_`)
  lines.push(``)
  lines.push(`*DISPATCH BILL*`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`*Invoice No:* ${dispatch.dispatchNumber}`)
  lines.push(`*Date:* ${dispatch.dispatchDate}`)
  lines.push(``)
  lines.push(`*VEHICLE DETAILS*`)
  lines.push(`Vehicle: ${dispatch.vehicleNumber}`)
  lines.push(`Driver: ${dispatch.driverName}`)

  if (dispatch.driverPhone) {
    lines.push(`Mobile: ${dispatch.driverPhone}`)
  }

  lines.push(``)
  lines.push(`*FISH DETAILS*`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)

  closedSessions.forEach((s, index) => {
    const name =
      s.fishTypeName ||
      s.fishType?.name ||
      'Fish'

    const pond =
      s.pondName
        ? `${s.pondNumber ? `${s.pondNumber} - ` : ''}${s.pondName}`
        : 'Not assigned'

    const netWeight = parseFloat(s.netWeightKg || 0)
    const rate = parseFloat(s.ratePerKg || 0)
    const amount = parseFloat(s.totalAmount || 0)

    totalWeight += netWeight
    grandTotal += amount

    lines.push(``)
    lines.push(`*${index + 1}. ${name}*`)
    lines.push(`Pond: ${pond}`)
    lines.push(`Weight: ${netWeight.toFixed(2)} kg`)
    lines.push(`Rate: Rs. ${rate.toLocaleString('en-IN')}/kg`)
    lines.push(
      `Amount: *Rs. ${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}*`
    )
  })

  lines.push(``)
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`*BILL SUMMARY*`)
  lines.push(``)
  lines.push(`Total Net Weight: *${totalWeight.toFixed(2)} kg*`)
  lines.push(
    `Total Payable: *Rs. ${grandTotal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}*`
  )
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)
  lines.push(``)
  lines.push(`Thank you.`)
  lines.push(`*Mushtaque Fish Traders*`)

  const message = encodeURIComponent(lines.join('\n'))

  let phone = (dispatch.driverPhone || '').replace(/\D/g, '')

  if (phone.length === 10) {
    phone = '91' + phone
  }

  return phone
    ? `https://wa.me/${phone}?text=${message}`
    : null
}

const generateAndSharePdf = async () => {
  if (completedSessions.length === 0) {
    alert('Pehle kam se kam ek fish ki weighing complete karo')
    return
  }

  const doc = await generateDispatchInvoice(
    dispatch,
    completedSessions   // ✅ sirf complete sessions
  )

  if (!doc) return

  const fileName = `Bill-${dispatch.dispatchNumber}.pdf`

  const pdfBlob = doc.output('blob')

  const pdfFile = new File(
    [pdfBlob],
    fileName,
    { type: 'application/pdf' }
  )

  if (
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: 'Dispatch Bill',
        text: `Bill for ${dispatch.vehicleNumber} - ${dispatch.dispatchDate}`
      })

      return
    } catch (e) {
      if (e.name === 'AbortError') return
    }
  }

  doc.save(fileName)
}

  const netPreview   = sessionTotal * (1 - deductionPct / 100)
  const totalPreview = netPreview * (parseFloat(rate) || 0)

  const confirmClose = async () => {
    if (!rate || isNaN(parseFloat(rate))) { alert('Enter rate'); return }
    setClosing(true)
    try {
      await sessionApi.close(activeSession.id, { ratePerKg: parseFloat(rate), deductionPct })
      setCloseModal(false)
      await loadSessions(); setActiveSession(null); setEntries([])
    } catch(e) { alert(e.message) }
    setClosing(false)
  }

  const sessionedFishIds = sessions.map(s => s.fishTypeId || s.fishType?.id)
  const availableFish = (fishTypes||[]).filter(f => f.active !== false && !sessionedFishIds.includes(f.id))

       // ===== DISPATCH TOTALS =====

const completedSessions = sessions.filter(
  s => s.closed || s.isClosed
)

const hasPendingSession = sessions.some(
  s => !(s.closed || s.isClosed)
)

const canCompleteDispatch =
  sessions.length > 0 &&
  completedSessions.length === sessions.length &&
  !hasPendingSession &&
  dispatch.status !== 'DISPATCHED'

const totalDispatchWeight = completedSessions.reduce(
  (sum, s) => sum + parseFloat(s.netWeightKg || 0),
  0
)

const totalDispatchAmount = completedSessions.reduce(
  (sum, s) => sum + parseFloat(s.totalAmount || 0),
  0
)

const completeDispatch = async () => {
  if (!canCompleteDispatch) return

  const ok = window.confirm(
    'Complete this dispatch? Once completed, it will be included in sales history.'
  )

  if (!ok) return

  setDispatching(true)

  try {
    await dispatchApi.markAsDispatched(dispatch.id)

    alert('Dispatch completed successfully.')

    onClose()
  } catch (e) {
    alert(e.message)
  } finally {
    setDispatching(false)
  }
}

// ===== END DISPATCH TOTALS =====
  return (
    <Modal open={true} onClose={onClose} title={`🚛 ${dispatch.dispatchNumber} — ${dispatch.vehicleNumber}`} size="modal-xl">
      <div className="modal-body">
        <div className="status-flow">
          {STATUS_STEPS.map((s,i) => {
            const cur = STATUS_STEPS.indexOf(dispatch.status)
            return <div key={s} className={`sf-step ${i<cur?'done':i===cur?'active':''}`}>{s}</div>
          })}
        </div>

        <div className="info-grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr',marginBottom:16}}>
  <div className="info-item"><div className="info-lbl">Vehicle</div><div className="info-val">{dispatch.vehicleNumber}</div></div>
  <div className="info-item"><div className="info-lbl">Driver</div><div className="info-val">{dispatch.driverName}</div></div>
  <div className="info-item"><div className="info-lbl">Mobile</div><div className="info-val">{dispatch.driverPhone || '—'}</div></div>
  <div className="info-item"><div className="info-lbl">Date</div><div className="info-val">{dispatch.dispatchDate}</div></div>
</div>

        <div className="tabs">
          <button className={`tab-btn ${activeTab==='loading'?'active':''}`} onClick={() => setTab('loading')}>
            ⚖️ Fish Weighing
          </button>
          <button className={`tab-btn ${activeTab==='summary'?'active':''}`} onClick={() => setTab('summary')}>
            📊 Summary
          </button>
        </div>

        {activeTab === 'loading' && (
          <div style={{paddingTop:20}}>
            {!activeSession ? (
              <>
                {loadingS ? <Loader/> : sessions.length > 0 && (
                  <div style={{marginBottom:20}}>
                    <div className="section-title">🐟 Fish Summary</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {sessions.map(s => (
                        <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:'var(--r)',padding:'12px 16px'}}>
                          <span style={{fontSize:18}}>🐟</span>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:15}}>{s.fishTypeName || s.fishType?.name}</div>
                            🏊 {s.pondNumber || ''}{s.pondNumber && s.pondName ? ' — ' : ''}{s.pondName || 'Pond not assigned'}
                            {/* <div style={{fontSize:12,color:'var(--ink3)',fontFamily:'var(--mono)'}}>{s.sessionLabel}</div> */}
                          </div>
                          <span className={`badge ${s.closed||s.isClosed ? 'badge-muted' : 'badge-amber'}`}>
                            {s.closed||s.isClosed ? '✅ Complete' : '⏳ Weighing in progress'}
                          </span>
                          {!(s.closed||s.isClosed) && (
                            <button className="btn btn-primary btn-sm" onClick={() => openSession(s)}>⚖️ Continue Weighing</button>
                          )}
                          {(s.closed||s.isClosed) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => openSession(s)}>👁 View Summary</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {availableFish.length > 0 && (
                  <div className="weight-input-zone">
                    <div className="section-title" style={{marginBottom:12}}> STEP 1 — 🐟 Select Fish & Pond</div>
                    <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
                      <div className="form-group" style={{flex:1,marginBottom:0}}>
                        <label>Fish Type</label>
                        <select value={selFish} onChange={e => setSelFish(e.target.value)}>
                          <option value="">— Select fish —</option>
                          {availableFish.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{flex:1,marginBottom:0}}>
      <label>Pond</label>

      <select
        value={selPond}
        onChange={e => setSelPond(e.target.value)}
      >
        <option value="">— Select pond —</option>

        {(ponds || [])
          .filter(p => p.status === 'ACTIVE')
          .map(p => (
            <option key={p.id} value={p.id}>
              {p.pondNumber} — {p.pondName}
            </option>
          ))}
      </select>
    </div>
                        <button
      className="btn btn-primary"
      onClick={createSession}
      disabled={!selFish || !selPond || creating}
      style={{flexShrink:0}}
    >
      {creating ? 'Starting...' : '⚖️ Start Weighing →'}
    </button>

  </div>
</div>
                )}
                {sessions.length === 0 && !loadingS && (
                  <Empty icon="⚖️" text="No fish weighing started yet" sub="Select a fish above and click Start Weighing"/>
                )}
              </>
            ) : (
              <div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setActiveSession(null); setEntries([]) }} style={{marginBottom:16}}>← Back to Fish List</button>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <span style={{fontSize:28}}>⚖️</span>
                  <div>
                    <div style={{fontSize:20,fontWeight:900}}>{activeSession.fishTypeName || activeSession.fishType?.name}</div>
                    <div style={{fontSize:13,color:'var(--ink3)',fontFamily:'var(--mono)'}}>{activeSession.sessionLabel}</div>
                  </div>
                  <div style={{marginLeft:'auto'}}>
                    <span className={`badge ${activeSession.closed||activeSession.isClosed ? 'badge-muted' : 'badge-amber'}`}>
                      {activeSession.closed||activeSession.isClosed ? '✅ Complete' : '⚖️ Inprogress'}
                    </span>
                  </div>
                </div>

                {!(activeSession.closed||activeSession.isClosed) && (
                  <div className="weight-input-zone">
                    <div style={{fontSize:14,fontWeight:700,color:'var(--pond)',marginBottom:12}}>
                      STEP 2 — ⚖️ Enter each basket weight
                    </div>
                    <div className="weight-input-row">
                      <input
                        ref={inputRef}
                        type="number" step="0.01"
                        placeholder="Basket Weight (kg)"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addBasket()}
                        className="input-big"
                        style={{flex:1.5}}
                      />
                      <input
                        placeholder="Notes (Optional)"
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addBasket()}
                        style={{flex:1}}
                      />
                      <button className="btn btn-primary" onClick={addBasket} disabled={adding || !weight} style={{flexShrink:0,fontSize:16,padding:'11px 20px'}}>
                        {adding ? '…' : '+ Add Weight'}
                      </button>
                    </div>
                    <Alert msg={wErr} onClose={() => setWErr('')}/>
                  </div>
                )}

                {loadingE ? <Loader/> : entries.length === 0 ? (
                  <Empty icon="⚖️" text="No baskets weighed yet" sub="Enter the basket weight above and click Add Weight"/>
                ) : (
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--ink3)',fontFamily:'var(--mono)',marginBottom:10,textTransform:'uppercase',letterSpacing:'1px'}}>
                      {entries.length} Baskets Recorded
                    </div>
                    <div className="basket-grid">
                      {entries.map(e => (
                        <div className="basket-chip" key={e.id}>
                          <div className="basket-num">#{e.basketNumber}</div>
                          <div className="basket-wt">{parseFloat(e.weightKg).toFixed(1)}</div>
                          <div className="basket-unit">kg</div>
                          {!(activeSession.closed||activeSession.isClosed) && (
                            <button className="basket-del" onClick={() => delBasket(e.id)}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="total-band">
                  <div>
                    <div className="total-band-label">{(activeSession.fishTypeName||'').toUpperCase()} TOTAL WEIGHT</div>
                    <div className="total-band-sub">{entries.length} baskets</div>
                  </div>
                  <div className="total-band-val">{sessionTotal.toFixed(3)} kg</div>
                </div>

                {!(activeSession.closed||activeSession.isClosed) && (
                  <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
                    <button className="btn btn-amber" onClick={openCloseModal}>
                      ✓ Complete Weighing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
  <div style={{paddingTop:20}}>
    {loadingS ? (
      <Loader/>
    ) : sessions.length === 0 ? (
      <Empty
        icon="📊"
        text="No completed weighing yet"
        sub="Complete fish weighing first"
      />
    ) : (
      <>
        <div style={{
          display:'flex',
          flexDirection:'column',
          gap:10
        }}>
          {sessions.map(s => (
            <div
              key={s.id}
              style={{
                background:'var(--surface2)',
                border:'1.5px solid var(--border)',
                borderRadius:'var(--r)',
                padding:'16px 20px',
                display:'flex',
                alignItems:'center',
                gap:14
              }}
            >
              <span style={{fontSize:24}}>🐟</span>

              <div style={{flex:1}}>
                <div style={{fontSize:17,fontWeight:800}}>
                  {s.fishTypeName || s.fishType?.name}
                </div>

                 🏊 {s.pondNumber || ''}{s.pondNumber && s.pondName ? ' — ' : ''}{s.pondName || 'Pond not assigned'}

                {/* <div style={{
                  fontSize:12,
                  color:'var(--ink3)',
                  fontFamily:'var(--mono)',
                  marginTop:2
                }}>
                  {s.sessionLabel}
                </div> */}

                {(s.closed || s.isClosed) && s.totalAmount && (
                  <div style={{
                    fontSize:13,
                    color:'var(--ink3)',
                    marginTop:4
                  }}>
                    Net: {s.netWeightKg} kg × ₹{s.ratePerKg}
                    {' = '}
                    <b>₹{s.totalAmount}</b>
                  </div>
                )}
              </div>

              <span className={`badge ${
                s.closed || s.isClosed
                  ? 'badge-green'
                  : 'badge-amber'
              }`}>
                {s.closed || s.isClosed
                  ? '✅ Complete'
                  : '⏳ Pending'}
              </span>
            </div>
          ))}
        </div>

        {/* TOTAL - ONLY ON SUMMARY TAB */}
        {completedSessions.length > 0 && (
          <div
            className="total-band"
            style={{marginTop:18}}
          >
            <div>
              <div className="total-band-label">
                TOTAL NET WEIGHT
              </div>

              <div className="total-band-val">
                {totalDispatchWeight.toFixed(2)} kg
              </div>
            </div>

            <div style={{textAlign:'right'}}>
              <div className="total-band-label">
                TOTAL AMOUNT
              </div>

              <div className="total-band-val">
                ₹{totalDispatchAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>
        )}
        {/* COMPLETE DISPATCH BUTTON */}
        {canCompleteDispatch && (
          <div style={{
            marginTop:16,
            display:'flex',
            justifyContent:'flex-end'
          }}>
            <button
              className="btn btn-primary"
              onClick={completeDispatch}
              disabled={dispatching}
            >
              {dispatching
                ? 'Completing...'
                : '✓ Complete Dispatch'}
            </button>
          </div>
        )}


        {/* ALREADY COMPLETED */}
        {dispatch.status === 'DISPATCHED' && (
          <div
            className="alert alert-success"
            style={{marginTop:16}}
          >
            ✅ Dispatch Completed — Included in Sales History
          </div>
        )}
      </>
    )}
  </div>
)}
      </div>
          <div className="modal-footer">

  {dispatch.status === 'DISPATCHED' && buildWhatsAppLink() && (
    <a
      href={buildWhatsAppLink()}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary"
      style={{textDecoration:'none'}}
    >
      💬 Share Bill on WhatsApp
    </a>
  )}

  {dispatch.status === 'DISPATCHED' && completedSessions.length > 0 && (
    <button
      className="btn btn-primary"
      onClick={generateAndSharePdf}
    >
      📄 Share PDF Bill
    </button>
  )}

</div>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="🐟 Fish Summary">
        <div className="modal-body">
          <div className="info-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div className="info-item">
              <div className="info-lbl">Total Weight (Gross)</div>
              <div className="info-val">{sessionTotal.toFixed(3)} kg</div>
            </div>
            <div className="form-group">
              <label>Deduction (%)</label>
              <input type="number" step="0.1" value={deductionPct}
                onChange={e => setDeductionPct(parseFloat(e.target.value) || 0)}/>
            </div>
          </div>

          <div className="info-item" style={{marginTop:12}}>
            <div className="info-lbl">Net Weight ({deductionPct}% after deduction)</div>
            <div className="info-val" style={{color:'var(--pond-light)',fontSize:20,fontWeight:800}}>
              {netPreview.toFixed(3)} kg
            </div>
          </div>

          <div className="form-group" style={{marginTop:16}}>
            <label>Rate per kg (₹)</label>
            <input type="number" step="0.01" placeholder="Example: 120" value={rate}
              onChange={e => setRate(e.target.value)} autoFocus/>
          </div>

          <div className="total-band" style={{marginTop:16}}>
            <div>
              <div className="total-band-label">TOTAL AMOUNT</div>
              <div className="total-band-sub">{netPreview.toFixed(3)} kg × ₹{rate||0}</div>
            </div>
            <div className="total-band-val">₹{totalPreview.toFixed(2)}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setCloseModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={confirmClose} disabled={closing}>
            {closing ? 'Saving...' : '✓ Complete'}
          </button>
        </div>
      </Modal>
    </Modal>
  )
}

// ═══ DISPATCHES PAGE ════════════════════════════════════════════════════════════
function DispatchesPage({
  dispatchCustomer,
  clearDispatchCustomer
}) {
  const { data, loading, error, reload } = useData(dispatchApi.getAll)
  const { data: fishTypes } = useData(fishApi.getAll)
  const { data: ponds } = useData(pondApi.getAll)
  const {
  data: customers,
  reload: reloadCustomers
} = useData(customerApi.getAll)
  const [modal, setModal]     = useState(false)
  const [detailD, setDetailD] = useState(null)
  const today = getLocalDate()

const [form, setForm] = useState({
  dispatchNumber:'',
  customerId:'',
  vehicleNumber:'',
  dispatchDate:today
})

const [saving, setSaving] = useState(false)
const [fErr, setFErr] = useState('')

const [delId, setDelId] = useState(null)
const [deling, setDel] = useState(false)

const [customerModal, setCustomerModal] = useState(false)

const [customerForm, setCustomerForm] = useState({
  name:'',
  mobile:'',
  address:'',
  gstNumber:'',
  customerType:'RETAIL'
})

const [customerSaving, setCustomerSaving] = useState(false)
const [customerErr, setCustomerErr] = useState('')

 const openCreate = () => {

  const d = today.replace(/-/g,'')

  const seq = String(
    (data?.filter(x => x.dispatchDate === today).length || 0) + 1
  ).padStart(3,'0')

  setForm({
  dispatchNumber:`D-${d}-${seq}`,
  customerId:'',
  vehicleNumber:'',
  dispatchDate:today
})

  setFErr('')
  setModal(true)
}

useEffect(() => {

  if (!dispatchCustomer) return

  const d = today.replace(/-/g,'')

  const seq = String(
    (data?.filter(x => x.dispatchDate === today).length || 0) + 1
  ).padStart(3,'0')

  setForm({
  dispatchNumber:`D-${d}-${seq}`,
  customerId:String(dispatchCustomer.id),
  vehicleNumber:'',
  dispatchDate:today
})

  setFErr('')
  setModal(true)

  clearDispatchCustomer?.()

}, [dispatchCustomer])

  const save = async () => {

  if (!form.customerId) {
    setFErr('Please select a customer')
    return
  }

 if (!form.vehicleNumber.trim()) {
  setFErr('Vehicle number is required')
  return
}

  setSaving(true)
  setFErr('')

  try {

    await dispatchApi.create({
  customerId: Number(form.customerId),
  vehicleNumber: form.vehicleNumber.trim(),
  dispatchDate: form.dispatchDate
})

    await reload()
    setModal(false)

  } catch(e) {
    setFErr(e.message)
  }

  setSaving(false)
}

const saveCustomer = async () => {

  if (!customerForm.name.trim()) {
    setCustomerErr('Customer name is required')
    return
  }

  setCustomerSaving(true)
  setCustomerErr('')

  try {

    const created = await customerApi.create({
      name: customerForm.name.trim(),
      mobile: customerForm.mobile.trim() || null,
      address: customerForm.address.trim() || null,
      gstNumber: customerForm.gstNumber.trim() || null,
      customerType: customerForm.customerType
    })

    await reloadCustomers()

    // automatically select newly created customer
    setForm(prev => ({
      ...prev,
      customerId: String(created.id)
    }))

    setCustomerModal(false)

    setCustomerForm({
      name:'',
      mobile:'',
      address:'',
      gstNumber:'',
      customerType:'RETAIL'
    })

  } catch(e) {
    setCustomerErr(e.message)
  }

  setCustomerSaving(false)
}

  const del = async () => {
    setDel(true)
    try { await dispatchApi.delete(delId); reload(); setDelId(null) } catch(e) { alert(e.message) }
    setDel(false)
  }

  const STATUS_COLORS = { CREATED:'badge-muted', LOADING:'badge-amber', DISPATCHED:'badge-blue', RETURNED:'badge-green', CLOSED:'badge-green' }
  const STATUS_LABELS = { CREATED:'Created', LOADING:'Loading', DISPATCHED:'Dispatch', RETURNED:'Returned', CLOSED:'Complete' }

  const todayDisp = data?.filter(d => d.dispatchDate === today).length || 0

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">🚛 Vehicle Dispatch</div>
          <div className="page-desc">Record the vehicle dispatch here and add basket weights</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add New Vehicle</button>
      </div>
      {error && <Alert msg={error}/>}


      <div className="stats-grid">
        <div className="stat-card stat-blue" data-icon="🚛">
          <div className="stat-lbl">Dispatched Today</div>
          <div className="stat-val">{todayDisp}</div>
          <div className="stat-unit">vehicles today</div>
        </div>
        <div className="stat-card stat-amber" data-icon="⏳">
          <div className="stat-lbl">In Transit</div>
          <div className="stat-val">{data?.filter(d => d.status === 'DISPATCHED').length || 0}</div>
          <div className="stat-unit">vehicles currently out</div>
        </div>
        <div className="stat-card stat-pond" data-icon="📋">
          <div className="stat-lbl">Total Dispatches</div>
          <div className="stat-val">{data?.length || 0}</div>
          <div className="stat-unit">total records</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <Loader/> : !data?.length ? (
            <Empty icon="🚛" text="No dispatch yet" sub="Click here to add a vehicle"/>
          ) : (
            <table>
              <thead>
  <tr>
    <th>Dispatch No.</th>
    <th>Customer</th>
    <th>Vehicle</th>
    <th>Driver</th>
    <th>Date</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>
</thead>
              <tbody>
                {data.map(d => (
                  <tr key={d.id}>
                    <td className="td-mono">{d.dispatchNumber}</td>
                    <td>
  <div style={{fontWeight:700}}>
    {d.customerName || '—'}
  </div>

  {d.customerMobile && (
    <div style={{
      fontSize:12,
      color:'var(--ink3)',
      marginTop:2
    }}>
      {d.customerMobile}
    </div>
  )}
</td>
                    <td className="td-main">{d.vehicleNumber}</td>
                    <td style={{fontWeight:600}}>{d.driverName}</td>
                    <td className="td-mono">{d.dispatchDate}</td>
                    <td><span className={`badge ${STATUS_COLORS[d.status]||'badge-muted'}`}>{STATUS_LABELS[d.status]||d.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary btn-sm" onClick={() => setDetailD(d)}>
                          ⚖️ Start / Continue Weighing
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDelId(d.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

     <Modal open={modal} onClose={() => setModal(false)} title="🚛 Vehicle Details">
  <div className="modal-body">

    <Alert msg={fErr} onClose={() => setFErr('')}/>

    {/* CUSTOMER SECTION */}
    <div style={{
      background:'var(--surface2)',
      border:'1.5px solid var(--border)',
      borderRadius:'var(--r)',
      padding:16,
      marginBottom:18
    }}>

      <div style={{
        display:'flex',
        justifyContent:'space-between',
        alignItems:'center',
        marginBottom:10
      }}>
        <div style={{
          fontSize:14,
          fontWeight:800
        }}>
          👤 Customer
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => {
            setCustomerErr('')

            setCustomerForm({
              name:'',
              mobile:'',
              address:'',
              gstNumber:'',
              customerType:'RETAIL'
            })

            setCustomerModal(true)
          }}
        >
          + New Customer
        </button>
      </div>

      <div
        className="form-group"
        style={{marginBottom:0}}
      >
        <label>Select Customer *</label>

        <select
          value={form.customerId}
          onChange={e =>
            setForm({
              ...form,
              customerId:e.target.value
            })
          }
        >
          <option value="">
            — Select customer —
          </option>

          {(customers || []).map(c => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.name}
              {c.mobile ? ` — ${c.mobile}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* SELECTED CUSTOMER DETAILS */}
      {form.customerId && (() => {

        const c = (customers || []).find(
          x => String(x.id) === String(form.customerId)
        )

        if (!c) return null

        return (
          <div style={{
            marginTop:12,
            paddingTop:10,
            borderTop:'1px solid var(--border)',
            fontSize:13,
            color:'var(--ink3)'
          }}>
            <b style={{
              color:'var(--ink)',
              marginRight:6
            }}>
              {c.name}
            </b>

            {c.mobile && (
              <span>
                📱 {c.mobile}
              </span>
            )}

            {c.customerType && (
              <span
                className="badge badge-green"
                style={{marginLeft:8}}
              >
                {c.customerType}
              </span>
            )}
          </div>
        )
      })()}

    </div>

          <div className="form-grid form-grid-2">

  <div className="form-group">
    <label>Dispatch Number</label>
    <input
      value={form.dispatchNumber}
      readOnly
      title="Generated automatically"
    />
  </div>

  <div className="form-group">
    <label>Date</label>
    <input
      type="date"
      value={form.dispatchDate}
      onChange={e =>
        setForm({
          ...form,
          dispatchDate:e.target.value
        })
      }
    />
  </div>

  <div className="form-group span2">
    <label>Vehicle Number *</label>
    <input
      placeholder="Example: UP55 AB 1234"
      value={form.vehicleNumber}
      onChange={e =>
        setForm({
          ...form,
          vehicleNumber:e.target.value
        })
      }
    />
  </div>

</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : '✅ Create Dispatch'}</button>
        </div>
      </Modal>
      <Modal
  open={customerModal}
  onClose={() => setCustomerModal(false)}
  title="👤 New Customer"
>
  <div className="modal-body">

    <Alert
      msg={customerErr}
      onClose={() => setCustomerErr('')}
    />

    <div className="form-grid form-grid-2">

      <div className="form-group">
        <label>Customer Name *</label>

        <input
          placeholder="Example: Mukesh Fish Traders"
          value={customerForm.name}
          onChange={e =>
            setCustomerForm({
              ...customerForm,
              name:e.target.value
            })
          }
          autoFocus
        />
      </div>


      <div className="form-group">
        <label>Mobile Number</label>

        <input
          placeholder="Example: 9876543210"
          value={customerForm.mobile}
          onChange={e =>
            setCustomerForm({
              ...customerForm,
              mobile:e.target.value
            })
          }
        />
      </div>


      <div className="form-group">
        <label>Customer Type</label>

        <select
          value={customerForm.customerType}
          onChange={e =>
            setCustomerForm({
              ...customerForm,
              customerType:e.target.value
            })
          }
        >
          <option value="RETAIL">
            Retail
          </option>

          <option value="WHOLESALE">
            Wholesale
          </option>
        </select>
      </div>


      <div className="form-group">
        <label>GST Number</label>

        <input
          placeholder="Optional"
          value={customerForm.gstNumber}
          onChange={e =>
            setCustomerForm({
              ...customerForm,
              gstNumber:e.target.value
            })
          }
        />
      </div>


      <div className="form-group span2">
        <label>Address</label>

        <textarea
          placeholder="Customer address (optional)"
          value={customerForm.address}
          onChange={e =>
            setCustomerForm({
              ...customerForm,
              address:e.target.value
            })
          }
        />
      </div>

    </div>

  </div>


  <div className="modal-footer">

    <button
      className="btn btn-ghost"
      onClick={() => setCustomerModal(false)}
    >
      Cancel
    </button>

    <button
      className="btn btn-primary"
      onClick={saveCustomer}
      disabled={customerSaving}
    >
      {customerSaving
        ? 'Saving...'
        : '✅ Save Customer'}
    </button>

  </div>

</Modal>

      {detailD && (
        <DispatchDetail
          dispatch={detailD}
          fishTypes={fishTypes || []}
           ponds={ponds || []}
          onClose={() => { setDetailD(null); reload() }}
        />
      )}
      <Confirm open={!!delId} onClose={() => setDelId(null)} onOk={del} loading={deling}/>
    </div>
  )
}

// ═══ SALES HISTORY PAGE ═══════════════════════════════════════════════════════
function SalesHistoryPage() {

  const {
    data,
    loading,
    error,
    reload
  } = useData(salesApi.getHistory)

const [filterType, setFilterType] = useState('all')
const [fromDate, setFromDate] = useState('')
const [toDate, setToDate] = useState('')
const [search, setSearch] = useState('')

const today = getLocalDate()
const currentMonth = getLocalMonth()

// const today = new Date().toISOString().slice(0, 10)

// const currentMonth = today.slice(0, 7)

// const now = new Date()

// const today =
//   `${now.getFullYear()}-` +
//   `${String(now.getMonth() + 1).padStart(2, '0')}-` +
//   `${String(now.getDate()).padStart(2, '0')}`

// const currentMonth =
//   `${now.getFullYear()}-` +
//   `${String(now.getMonth() + 1).padStart(2, '0')}`

  const formatMoney = value =>
    Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

  const formatWeight = value =>
    Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

  const formatDate = value => {
    if (!value) return '—'

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // const dispatches = data?.dispatches || []

  const allDispatches = data?.dispatches || []

const dispatches = allDispatches.filter(d => {

  const date = d.dispatchDate

  if (filterType === 'today') {
    return date === today
  }

  if (filterType === 'month') {
    return date?.startsWith(currentMonth)
  }

  if (filterType === 'custom') {

    if (fromDate && date < fromDate) {
      return false
    }

    if (toDate && date > toDate) {
      return false
    }
  }
   // SEARCH FILTER
  const q = search.trim().toLowerCase()

  if (q) {
    const matchesSearch =
      d.driverName?.toLowerCase().includes(q) ||
      d.vehicleNumber?.toLowerCase().includes(q) ||
      d.dispatchNumber?.toLowerCase().includes(q) ||
      d.driverPhone?.toLowerCase().includes(q)

    if (!matchesSearch) {
      return false
    }
  }

  return true
})

const filteredTotalSales = dispatches.reduce(
  (sum, d) => sum + Number(d.totalAmount || 0),
  0
)

const filteredTotalWeight = dispatches.reduce(
  (sum, d) => sum + Number(d.totalWeightKg || 0),
  0
)

const filteredTotalDispatches = dispatches.length

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-hdr">
        <div>
          <div className="page-title">
            💰 Sales History
          </div>

          <div className="page-desc">
            Completed dispatch sales and payment history
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={reload}
        >
          ↻ Refresh
        </button>
      </div>


      {/* ERROR */}
      {error && (
        <Alert
          msg={error}
        />
      )}

{/* FILTERS */}
<div
  className="card"
  style={{
    padding:16,
    marginBottom:18
  }}
>
  <div style={{
    display:'flex',
    alignItems:'flex-end',
    gap:12,
    flexWrap:'wrap'
  }}>

    <div>
      <div style={{
        fontSize:12,
        fontWeight:700,
        marginBottom:7,
        color:'var(--ink3)'
      }}>
        QUICK FILTER
      </div>

      <div style={{display:'flex', gap:7}}>
        <button
          className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setFilterType('all')
            setFromDate('')
            setToDate('')
          }}
        >
          All
        </button>

        <button
          className={`btn ${filterType === 'today' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setFilterType('today')
            setFromDate('')
            setToDate('')
          }}
        >
          Today
        </button>

        <button
          className={`btn ${filterType === 'month' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setFilterType('month')
            setFromDate('')
            setToDate('')
          }}
        >
          This Month
        </button>
      </div>
    </div>

    <div className="form-group" style={{marginBottom:0}}>
      <label>From Date</label>
      <input
        type="date"
        value={fromDate}
        onChange={e => {
          setFromDate(e.target.value)
          setFilterType('custom')
        }}
      />
    </div>

    <div className="form-group" style={{marginBottom:0}}>
      <label>To Date</label>
      <input
        type="date"
        value={toDate}
        onChange={e => {
          setToDate(e.target.value)
          setFilterType('custom')
        }}
      />
    </div>

    <div
  className="form-group"
  style={{
    marginBottom:0,
    minWidth:260,
    flex:1
  }}
>
  <label>Search</label>

  <input
    type="text"
    placeholder="Driver, vehicle, dispatch no..."
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>

    {(filterType !== 'all' || fromDate || toDate || search) && (
      <button
        className="btn btn-ghost"
        onClick={() => {
          setFilterType('all')
          setFromDate('')
          setToDate('')
        }}
      >
        ✕ Clear
      </button>
    )}

  </div>
</div>

      {/* SUMMARY CARDS */}
      <div className="stats-grid">

        <div
          className="stat-card stat-green"
          data-icon="₹"
        >
          <div className="stat-lbl">
            Total Sales
          </div>

          <div
            className="stat-val"
            style={{fontSize:28}}
          >
            {/* ₹{formatMoney(data?.totalSales)} */}
            ₹{formatMoney(filteredTotalSales)}
          </div>

          <div className="stat-unit">
            total completed sales
          </div>
        </div>


        <div
          className="stat-card stat-blue"
          data-icon="⚖️"
        >
          <div className="stat-lbl">
            Total Weight Sold
          </div>

          <div
            className="stat-val"
            style={{fontSize:28}}
          >
            {/* {formatWeight(data?.totalWeightKg)} */}
            {formatWeight(filteredTotalWeight)} kg
          </div>

          <div className="stat-unit">
            kg sold
          </div>
        </div>


        <div
          className="stat-card stat-pond"
          data-icon="🚛"
        >
          <div className="stat-lbl">
            Completed Dispatches
          </div>

          <div className="stat-val">
           {/* {data?.totalDispatches || 0}  */}
           {filteredTotalDispatches}
          </div>

          <div className="stat-unit">
            dispatches included in sales
          </div>
        </div>

      </div>


      {/* HISTORY TABLE */}
      <div className="card">

        <div className="card-hdr">
          <div>
            <div className="card-title">
              📋 Sales Records
            </div>

            <div className="card-sub">
              Dispatch-wise completed sales
            </div>
          </div>
        </div>


        <div className="table-wrap">

          {loading ? (

            <Loader/>

          ) : dispatches.length === 0 ? (

            <Empty
              icon="💰"
              text="No sales history yet"
              sub="Completed dispatches will appear here"
            />

          ) : (

            <table>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Dispatch No.</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Mobile</th>
                  <th style={{textAlign:'right'}}>
                    Weight
                  </th>
                  <th style={{textAlign:'right'}}>
                    Amount
                  </th>
                </tr>
              </thead>


              <tbody>

                {dispatches.map(d => (

                  <tr key={d.dispatchId}>

                    <td className="td-mono">
                      {formatDate(d.dispatchDate)}
                    </td>


                    <td className="td-mono">
                      {d.dispatchNumber}
                    </td>


                    <td className="td-main">
                      {d.vehicleNumber}
                    </td>


                    <td style={{fontWeight:600}}>
                      {d.driverName}
                    </td>


                    <td className="td-mono">
                      {d.driverPhone || '—'}
                    </td>


                    <td
                      style={{
                        textAlign:'right',
                        fontFamily:'var(--mono)',
                        fontWeight:700
                      }}
                    >
                      {formatWeight(d.totalWeightKg)} kg
                    </td>


                    <td
                      style={{
                        textAlign:'right',
                        fontFamily:'var(--mono)',
                        fontWeight:900,
                        color:'var(--pond-light)'
                      }}
                    >
                      ₹{formatMoney(d.totalAmount)}
                    </td>

                  </tr>

                ))}

              </tbody>


              {/* GRAND TOTAL */}
              <tfoot>
                <tr
                  style={{
                    background:'var(--surface2)'
                  }}
                >

                  <td
                    colSpan={5}
                    style={{
                      textAlign:'right',
                      fontWeight:800
                    }}
                  >
                    GRAND TOTAL
                  </td>


                  <td
                    style={{
                      textAlign:'right',
                      fontFamily:'var(--mono)',
                      fontWeight:900
                    }}
                  >
                    {/* {formatWeight(data?.totalWeightKg)} kg */}
                    {formatWeight(filteredTotalWeight)} kg
                  </td>


                  <td
                    style={{
                      textAlign:'right',
                      fontFamily:'var(--mono)',
                      fontWeight:900,
                      fontSize:16,
                      color:'var(--pond-light)'
                    }}
                  >
                    {/* ₹{formatMoney(data?.totalSales)} */}
                    ₹{formatMoney(filteredTotalSales)}
                  </td>

                </tr>
              </tfoot>

            </table>

          )}

        </div>
      </div>

    </div>
  )
}

// ═══ DASHBOARD ════════════════════════════════════════════════════════════════
function DashboardPage({ onNav }) {
  const { data: inv }       = useData(invApi.getAll)
  const { data: harvests }  = useData(harvestApi.getAll)
  const { data: dispatches }= useData(dispatchApi.getAll)
  const { data: ponds }     = useData(pondApi.getAll)
  const { data: fishes }    = useData(fishApi.getAll)

  // const today      = new Date().toISOString().slice(0,10)
  const today = getLocalDate()
  const totalStock = inv?.reduce((s,i) => s + parseFloat(i.currentStockKg||0), 0) || 0
  const todayHvKg  = harvests?.filter(h => h.harvestDate === today)
    .reduce((s,h) => s + (h.items||[]).reduce((ss,it) => ss + parseFloat(it.weightKg||0), 0), 0) || 0
  const todayDisp  = dispatches?.filter(d => d.dispatchDate === today).length || 0
  const inTransit  = dispatches?.filter(d => d.status === 'DISPATCHED').length || 0

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">🏡 Dashboard</div>
          <div className="page-desc">{new Date().toLocaleDateString('hi-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-green" data-icon="📦">
          <div className="stat-lbl">Total Stock</div>
          <div className="stat-val">{totalStock.toFixed(0)}</div>
          <div className="stat-unit">kg currently available</div>
        </div>
        <div className="stat-card stat-amber" data-icon="🎣">
          <div className="stat-lbl">Harvested Today</div>
          <div className="stat-val">{todayHvKg.toFixed(0)}</div>
          <div className="stat-unit">kg harvested today</div>
        </div>
        <div className="stat-card stat-blue" data-icon="🚛">
          <div className="stat-lbl">Dispatched Today</div>
          <div className="stat-val">{todayDisp}</div>
          <div className="stat-unit">vehicles today</div>
        </div>
        <div className="stat-card stat-pond" data-icon="🏊">
          <div className="stat-lbl">Active Ponds</div>
          <div className="stat-val">{ponds?.filter(p => p.status==='ACTIVE').length || 0}</div>
          <div className="stat-unit">talab active hain</div>
        </div>
        <div className="stat-card stat-green" data-icon="🐟">
          <div className="stat-lbl">Fish Types</div>
          <div className="stat-val">{fishes?.filter(f => f.active!==false).length || 0}</div>
          <div className="stat-unit">fish types</div>
        </div>
        <div className="stat-card stat-red" data-icon="🚛">
          <div className="stat-lbl">In Transit</div>
          <div className="stat-val">{inTransit}</div>
          <div className="stat-unit">vehicles in transit</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <div className="card" style={{cursor:'pointer'}} onClick={() => onNav('harvests')}>
          <div className="card-hdr">
            <div>
              <div className="card-title">📦 Current Stock</div>
              <div className="card-sub">Current fish availability</div>
            </div>
            <button className="btn btn-ghost btn-xs">View All →</button>
          </div>
          {!inv?.length ? (
            <Empty icon="📦" text="No stock available" />
          ) : (
            <table>
              <thead><tr><th>Machli</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {inv.slice(0,5).map(i => {
                  const s = parseFloat(i.currentStockKg||0)
                  return (
                    <tr key={i.fishTypeId||i.id}>
                      <td className="td-main">{i.fishTypeName}</td>
                      <td className="td-green">{s.toFixed(1)} kg</td>
                      <td><span className={`badge ${s>100?'badge-green':s>0?'badge-amber':'badge-red'}`}>{s>100?'Good':s>0?'Thoda':'Zero'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-hdr">
            <div>
              <div className="card-title">🚛 Aaj ki Vehicleyaan</div>
              <div className="card-sub">Dispatches created today</div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => onNav('dispatches')}>View All →</button>
          </div>
          {!dispatches?.length ? (
            <Empty icon="🚛" text="No dispatches today"/>
          ) : (
            <table>
              <thead><tr><th>Vehicle</th><th>Driver</th><th>Status</th></tr></thead>
              <tbody>
                {dispatches.filter(d => d.dispatchDate===today).slice(0,5).map(d => (
                  <tr key={d.id}>
                    <td className="td-mono">{d.vehicleNumber}</td>
                    <td style={{fontWeight:600}}>{d.driverName}</td>
                    <td><span className={`badge ${d.status==='DISPATCHED'?'badge-blue':d.status==='CLOSED'?'badge-green':'badge-amber'}`}>{d.status}</span></td>
                  </tr>
                ))}
                {dispatches.filter(d => d.dispatchDate===today).length === 0 && (
                  <tr><td colSpan={3}><div style={{textAlign:'center',padding:'20px',color:'var(--ink3)',fontSize:14}}>No dispatches today hua</div></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="card-title">🎣 Statusiya Katai</div>
            <div className="card-sub">Recent harvest records</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => onNav('harvests')}>View All →</button>
        </div>
        {!harvests?.length ? (
          <Empty icon="🎣" text="No harvest records" sub="Record a harvest first"/>
        ) : (
          <table>
            <thead><tr><th>No.</th><th>Talab</th><th>Date</th><th>Machli</th><th>Total Weight</th></tr></thead>
            <tbody>
              {harvests.slice(0,6).map(h => (
                <tr key={h.id}>
                  <td className="td-mono">{h.harvestNumber}</td>
                  <td className="td-main">{h.pondName || h.pond?.pondName || '—'}</td>
                  <td className="td-mono">{h.harvestDate}</td>
                  <td>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      {(h.items||[]).map((it,i) => <span key={i} className="badge badge-blue">{it.fishTypeName||it.fishType?.name}</span>)}
                    </div>
                  </td>
                  <td className="td-green">{(h.items||[]).reduce((s,it) => s+parseFloat(it.weightKg||0),0).toFixed(2)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ═══ NAV CONFIG ════════════════════════════════════════════════════════════════
const NAV = [
  { id:'dashboard',  label:'Dashboard',         icon:'🏡', group:'Overview' },
  { id:'fish-types', label:'Fish Types',  icon:'🐟', group:'Master Data' },
  { id:'ponds',      label:'Ponds',      icon:'🏊', group:'Master Data' },
  { id:'customers', label:'Customers', icon:'👥', group:'Master Data' },
  { id:'daily-feed', label:'Daily Feed', icon:'🌾', group:'Actions Karo' },
  { id:'harvests',   label:'Harvest',    icon:'🎣', group:'Actions Karo' },
  // { id:'inventory',  label:'Stock (Inventory)', icon:'📦', group:'Actions Karo' },
  {
  id:'inventory',label:'Fish Stock',icon:'📦',group:'Actions Karo'},
  { id:'dispatches', label:'Dispatch (Vehicle)',   icon:'🚛', group:'Actions Karo' },
  { id:'sales-history', label:'Sales History', icon:'💰', group:'Reports' },
]

function DailyFeedPage() { return <FeedManagementPage request={req} /> }

const PAGES = {
  'daily-feed': DailyFeedPage,
  dashboard:   DashboardPage,
  'fish-types':FishTypesPage,
  ponds:       PondsPage,
  customers: CustomersPage,
  harvests:    HarvestsPage,
  inventory:   InventoryPage,
  dispatches:  DispatchesPage,
  'sales-history': SalesHistoryPage,
}

// ═══ APP ROOT ══════════════════════════════════════════════════════════════════
export default function App() {
  const [active, setActive] = useState('dashboard')
  const [dispatchCustomer, setDispatchCustomer] = useState(null)
  const startCustomerDispatch = customer => {
  setDispatchCustomer(customer)
  setActive('dispatches')
}
  const Page = PAGES[active] || DashboardPage
  const groups = [...new Set(NAV.map(n => n.group))]
  const activeNav = NAV.find(n => n.id === active)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-fish-icon">🐟</span>
          <div className="logo-title">Fish Farm</div>
          <div className="logo-sub">Management System</div>
        </div>

        <nav className="sidebar-nav">
          {groups.map(g => (
            <div key={g}>
              <div className="nav-section">{g}</div>
              {NAV.filter(n => n.group === g).map(n => (
                <div key={n.id}
                  className={`nav-item ${active === n.id ? 'active' : ''}`}
                  onClick={() => setActive(n.id)}>
                  <span className="ni-icon">{n.icon}</span>
                  {n.label}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-farm-info">
          <div className="farm-info-label">Farm Size</div>
          <div className="farm-info-val">2 Acres</div>
        </div>

        <div className="sidebar-bottom">
          v1.0 · localhost:8080
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-page-name">{activeNav?.icon} {activeNav?.label}</div>
          <div className="topbar-right">
            <div className="topbar-date">
              {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
            </div>
          </div>
        </div>
        <Page
  onNav={setActive}
  onCustomerDispatch={startCustomerDispatch}
  dispatchCustomer={dispatchCustomer}
  clearDispatchCustomer={() => setDispatchCustomer(null)}
/>
      </div>
    </div>
  )
}