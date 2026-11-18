import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/context'
import LoginPage from '../auth/LoginPage'
import Loader from '../components/Loader'
import FarmLayout from '../layouts/FarmLayout'
import { canAccess, homePath, navigation } from './navigation'

export function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loader />
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  if (pathname !== location.pathname) return <Navigate to={{ pathname, search: location.search, hash: location.hash }} replace />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search + location.hash }} replace />
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/customers" replace />
  // A new farm must never retain another farm's page data or drafts.
  return <FarmLayout key={`${user.id}-${user.farmId}`} />
}

export function PageAccess({ page, children }) {
  const { user } = useAuth()
  return canAccess(user.role, page) ? children : <Navigate to={homePath(user.role)} replace />
}

export function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={homePath(user.role)} replace />
}

export function LoginRoute({ admin = false, legacySetup = false }) {
  const { user, loading } = useAuth()
  const { state } = useLocation()
  if (loading) return <Loader />
  if (!user) return <LoginPage key={legacySetup ? 'legacy' : admin ? 'admin' : 'login'} admin={admin} legacySetup={legacySetup} />
  const intended = state?.from
  const page = typeof intended === 'string' && navigation.find(item => intended.split(/[?#]/)[0] === `/${item.id}`)
  return <Navigate to={page && canAccess(user.role, page.id) ? intended : homePath(user.role)} replace />
}
