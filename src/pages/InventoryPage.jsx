import { useState } from 'react'
import { fishApi } from '../api/fishTypeApi'
import { pondApi } from '../api/pondApi'
import { fishStockApi } from '../api/fishStockApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'
import { getLocalDate } from '../utils/dates'

export default function InventoryPage() {

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
