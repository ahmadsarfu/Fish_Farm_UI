import { useCallback, useEffect, useState } from 'react'
import { request, clearSecurityToken } from '../api'
import { setBusinessZone } from '../businessDate'
import { AuthContext } from './context'

export default function AuthProvider({ children }) {
  const [user, storeUser] = useState(null)
  const setUser = useCallback(value => { setBusinessZone(value?.timeZone); storeUser(value) }, [])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const expired = () => { clearSecurityToken(); setUser(null) }
    window.addEventListener('farm-session-expired', expired)
    request('/api/auth/me').then(value => { if (alive) setUser(value) }).catch(() => {}).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; window.removeEventListener('farm-session-expired', expired) }
  }, [setUser])
  async function logout() {
    await request('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }
  async function selectFarm(id) {
    const result = await request('/api/auth/select-farm', { method: 'POST', body: JSON.stringify({ farmId: Number(id) }) })
    setUser(result)
  }
  return <AuthContext.Provider value={{ user, setUser, loading, logout, selectFarm }}>{children}</AuthContext.Provider>
}
