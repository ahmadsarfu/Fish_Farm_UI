import { useCallback, useEffect, useRef, useState } from 'react'

// Ignore stale responses after a page unmounts or a newer refresh starts.
export default function useData(fetchData) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lifecycle = useRef({ active: false, revision: 0 })
  const reload = useCallback(async () => {
    const state = lifecycle.current
    const request = ++state.revision
    setLoading(true)
    setError(null)
    try {
      const result = await fetchData()
      if (state.active && request === state.revision) setData(result)
    } catch (failure) {
      if (state.active && request === state.revision) setError(failure.message)
    } finally {
      if (state.active && request === state.revision) setLoading(false)
    }
  }, [fetchData])
  useEffect(() => {
    const state = { active: true, revision: 0 }
    lifecycle.current = state
    async function load() {
      try {
        const result = await fetchData()
        if (state.active && state.revision === 0) { setData(result); setError(null) }
      } catch (failure) {
        if (state.active && state.revision === 0) setError(failure.message)
      } finally {
        if (state.active && state.revision === 0) setLoading(false)
      }
    }
    load()
    return () => { state.active = false }
  }, [fetchData])
  return { data, loading, error, reload }
}
