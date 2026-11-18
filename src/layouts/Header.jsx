import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { navigation } from '../routing/navigation'

export default function Header({ onError }) {
  const { user, logout, selectFarm } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const page = navigation.find(item => pathname === `/${item.id}`)
  const perform = async action => {
    try { onError(''); await action() } catch (error) { onError(error.message) }
  }
  return <header className="topbar">
    <div className="topbar-page-name">{page?.icon} {page?.label || 'Page not found'}</div>
    <div className="topbar-right session-controls">
      <span>{user.displayName} · {user.role}</span>
      {user.farms.length > 1 && <select aria-label="Current farm" value={user.farmId} onChange={event => perform(async () => { await selectFarm(event.target.value); navigate(pathname, { replace: true }) })}>{user.farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>}
      <button className="btn btn-ghost btn-sm" onClick={() => perform(logout)}>Log out</button>
      <div className="topbar-date">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: user.timeZone })}</div>
    </div>
  </header>
}
