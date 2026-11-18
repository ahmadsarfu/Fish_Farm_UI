import { useNavigate } from 'react-router-dom'
import { fishApi } from '../api/fishTypeApi'
import { pondApi } from '../api/pondApi'
import { harvestApi } from '../api/harvestApi'
import { invApi } from '../api/inventoryApi'
import { dispatchApi } from '../api/dispatchApi'
import useData from '../hooks/useData'
import Empty from '../components/Empty'
import { getLocalDate } from '../utils/dates'
import { businessTimeZone } from '../businessDate'

export default function DashboardPage() {
  const navigate = useNavigate()
  const onNav = page => navigate(`/${page}`)
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
          <div className="page-desc">{new Date().toLocaleDateString('hi-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:businessTimeZone()})}</div>
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
