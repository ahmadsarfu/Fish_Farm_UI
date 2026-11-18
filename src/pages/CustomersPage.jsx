import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { customerApi } from '../api/customerApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function CustomersPage() {
  const navigate = useNavigate()
  const onCustomerDispatch = customer => navigate(`/dispatches?customerId=${encodeURIComponent(customer.id)}`)

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
