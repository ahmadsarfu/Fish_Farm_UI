import { Suspense, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/context'
import { homePath } from '../../routing/navigation'
import Alert from '../../components/Alert'
import Loader from '../../components/Loader'

export default function PlatformLayout() {
  const { user, loading, logout } = useAuth()
  const [error, setError] = useState('')
  if (loading) return <Loader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (user.role !== 'SUPER_ADMIN') return <Navigate to={homePath(user.role)} replace />
  return <div className="app platform-app"><aside className="sidebar"><div className="sidebar-logo"><span className="logo-fish-icon">🐟</span><div className="logo-title">Fish Farm</div><div className="logo-sub">Super Admin</div></div><nav className="sidebar-nav" aria-label="Platform navigation"><NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/admin/customers">Customers & plans</NavLink><NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/admin/activity">Activity</NavLink><NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/admin/account">My Account</NavLink></nav><div className="sidebar-bottom">Platform administration</div></aside><div className="main"><header className="topbar"><strong>Manage your fish farm business</strong><div className="session-controls"><span>{user.displayName}</span><button className="btn btn-ghost btn-sm" onClick={async () => { try { await logout() } catch (failure) { setError(failure.message) } }}>Log out</button></div></header><Alert msg={error} /><Suspense fallback={<Loader />}><Outlet /></Suspense></div></div>
}
