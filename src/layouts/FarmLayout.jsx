import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import Alert from '../components/Alert'
import Loader from '../components/Loader'
import Sidebar from './Sidebar'
import Header from './Header'

export default function FarmLayout() {
  const { user } = useAuth()
  const [sessionError, setSessionError] = useState('')
  return <div className="app">
    <Sidebar user={user} />
    <div className="main">
      <Header onError={setSessionError} />
      <Alert msg={sessionError} onClose={() => setSessionError('')} />
      <Suspense fallback={<Loader />}><Outlet /></Suspense>
    </div>
  </div>
}
