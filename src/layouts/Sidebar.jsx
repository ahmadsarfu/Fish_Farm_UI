import { useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { navigation, canAccess } from '../routing/navigation'

export default function Sidebar({ user }) {
  const nav = useRef(null)
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    if (!window.matchMedia('(max-width: 860px)').matches) return
    const active = nav.current?.querySelector('[aria-current="page"]')
    if (!active) return
    const menu = nav.current.getBoundingClientRect()
    const item = active.getBoundingClientRect()
    nav.current.scrollLeft += item.left - menu.left - (menu.width - item.width) / 2
  }, [pathname, user.role])
  const items = navigation.filter(item => canAccess(user.role, item.id))
  const groups = [...new Set(items.map(item => item.group))]
  return <aside className="sidebar">
    <div className="sidebar-logo"><span className="logo-fish-icon">🐟</span><div className="logo-title">Fish Farm</div><div className="logo-sub">Management System</div></div>
    <nav ref={nav} className="sidebar-nav" aria-label="Main navigation">
      {groups.map(group => <div key={group}>
        <div className="nav-section">{group}</div>
        {items.filter(item => item.group === group).map(item => <NavLink key={item.id} to={`/${item.id}`} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="ni-icon">{item.icon}</span>{item.label}
        </NavLink>)}
      </div>)}
    </nav>
    <div className="sidebar-farm-info"><div className="farm-info-label">Current farm</div><div className="farm-info-val">{user.farms.find(farm => farm.id === user.farmId)?.name}</div></div>
    <div className="sidebar-bottom">Fish Farm Management</div>
  </aside>
}
