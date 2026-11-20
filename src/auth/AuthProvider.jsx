import { useCallback, useEffect, useState } from 'react'
import { clearSecurityToken } from '../api/client'
import { authApi } from '../api/authApi'
import { setBusinessZone } from '../businessDate'
import { AuthContext } from './context'

export default function AuthProvider({ children }) {
  const [user, storeUser] = useState(null)
  const setUser = useCallback(value => { setBusinessZone(value?.timeZone); storeUser(value) }, [])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const recheck = () => { authApi.me().then(value => { if (alive) setUser(value) }).catch(() => {}) }
    window.addEventListener('farm-backend-ready', recheck)
    const expired = () => { clearSecurityToken(); setUser(null) }
    window.addEventListener('farm-session-expired', expired)
    authApi.me().then(value => { if (alive) setUser(value) }).catch(() => {}).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; window.removeEventListener('farm-backend-ready', recheck); window.removeEventListener('farm-session-expired', expired) }
  }, [setUser])
  async function logout() {
    await authApi.logout()
    setUser(null)
  }
  async function selectFarm(id) {
    const result = await authApi.selectFarm(id)
    setUser(result)
  }
  return <AuthContext.Provider value={{ user, setUser, loading, logout, selectFarm }}>{children}</AuthContext.Provider>
}
