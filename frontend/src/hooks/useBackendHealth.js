import { useCallback, useState } from 'react'
import { getHealth } from '../services/api'
import { usePolling } from './usePolling'

/**
 * Polls GET /health so the UI can show a live "backend online/offline"
 * indicator — useful since the demo backend may be a free-tier instance
 * that spins down when idle.
 */
export function useBackendHealth({ intervalMs = 20000 } = {}) {
  const [status, setStatus] = useState('checking') // 'checking' | 'online' | 'offline'

  const check = useCallback(async () => {
    try {
      await getHealth()
      setStatus('online')
    } catch {
      setStatus('offline')
    }
  }, [])

  usePolling(check, { intervalMs })

  return status
}
