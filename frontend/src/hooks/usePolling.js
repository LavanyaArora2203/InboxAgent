import { useEffect, useRef } from 'react'

/**
 * Calls `callback` immediately, then every `intervalMs` while `enabled`.
 * Used to poll GET /workflows/{run_id}/status without a websocket, since
 * the backend doesn't expose one.
 */
export function usePolling(callback, { intervalMs = 3000, enabled = true } = {}) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false

    const tick = () => {
      if (!cancelled) savedCallback.current()
    }

    tick()
    const id = setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, intervalMs])
}
