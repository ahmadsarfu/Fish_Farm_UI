import { useState } from 'react'
import { salesApi } from '../api/salesApi'
import useData from '../hooks/useData'
import Loader from '../components/Loader'
import Empty from '../components/Empty'
import Alert from '../components/Alert'
import { getLocalDate, getLocalMonth } from '../utils/dates'

export default function SalesHistoryPage() {

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
