import useData from '../../hooks/useData'
import { useState, useCallback, useRef } from 'react'
import { dispatchApi } from '../../api/dispatchApi'
import { sessionApi } from '../../api/sessionApi'
import { weightApi } from '../../api/weightApi'
import Loader from '../../components/Loader'
import Empty from '../../components/Empty'
import Alert from '../../components/Alert'
import Modal from '../../components/Modal'
import { generateDispatchInvoice } from '../invoice/dispatchInvoice'

export default function DispatchDetail({ dispatch, onClose, fishTypes,ponds }) {
  const [activeTab, setTab]     = useState('loading')
  const fetchSessions = useCallback(async () => {
    const all = await sessionApi.getAll()
    return (all || []).filter(session => session.dispatchId === dispatch.id || session.dispatch?.id === dispatch.id)
  }, [dispatch.id])
  const { data: sessionData, loading: loadingS, error: sessionError, reload: loadSessions } = useData(fetchSessions)
  const sessions = sessionData || []
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

  const loadEntries = useCallback(async (sessionId) => {
    setLoadingE(true)
    try { setEntries(await weightApi.getBySession(sessionId) || []) } catch(e) { setWErr(e.message) }
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
          {sessionError && <Alert msg={sessionError} />}
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
