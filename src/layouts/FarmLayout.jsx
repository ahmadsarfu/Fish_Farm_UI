import { Suspense, useLayoutEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import Alert from '../components/Alert'
import Loader from '../components/Loader'
import SubscriptionNotice from '../components/SubscriptionNotice'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function FarmLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    if (window.matchMedia('(max-width: 860px)').matches) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  const [sessionError, setSessionError] = useState('')
  return <div className="app farm-app">
    <Sidebar user={user} />
    <div className="main">
      <Header onError={setSessionError} />
      <Alert msg={sessionError} onClose={() => setSessionError('')} />
      <Suspense fallback={<Loader />}>{user.subscription?.accessAllowed === false && pathname !== '/account' ? <SubscriptionNotice subscription={user.subscription} /> : <Outlet />}</Suspense>
    </div>
  </div>
}
