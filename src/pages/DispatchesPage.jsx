import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { fishApi } from '../api/fishTypeApi'
import { pondApi } from '../api/pondApi'
import { dispatchApi } from '../api/dispatchApi'
import { customerApi } from '../api/customerApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'
import { getLocalDate } from '../utils/dates'
import DispatchDetail from '../components/dispatch/DispatchDetail'

export default function DispatchesPage() {
  const [params, setParams] = useSearchParams()
  const customerId = params.get('customerId') || ''
  const clearCustomer = () => setParams(current => {
    const next = new URLSearchParams(current)
    next.delete('customerId')
    return next
  }, { replace: true })
  return <DispatchesContent key={customerId} initialCustomerId={customerId} clearCustomer={clearCustomer} />
}

function DispatchesContent({ initialCustomerId, clearCustomer }) {
  const { data, loading, error, reload } = useData(dispatchApi.getAll)
  const { data: fishTypes } = useData(fishApi.getAll)
  const { data: ponds } = useData(pondApi.getAll)
  const {
  data: customers,
  reload: reloadCustomers
} = useData(customerApi.getAll)
  const [modal, setModal]     = useState(Boolean(initialCustomerId))
  const [detailD, setDetailD] = useState(null)
  const today = getLocalDate()

const [form, setForm] = useState({
  dispatchNumber:`D-${today.replace(/-/g, '')}-001`,
  customerId:initialCustomerId,
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

const closeCreate = () => {
  setModal(false)
  if (initialCustomerId) clearCustomer()
}

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
    closeCreate()

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

     <Modal open={modal} onClose={closeCreate} title="🚛 Vehicle Details">
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
          <button className="btn btn-ghost" onClick={closeCreate}>Cancel</button>
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
