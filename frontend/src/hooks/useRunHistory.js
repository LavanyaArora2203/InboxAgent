import { useCallback, useEffect, useState } from 'react'

/**
 * The backend has no "list all runs" endpoint (see api/routes.py) — a run
 * only becomes queryable once you already know its run_id. So this hook
 * keeps a small local record, in this browser, of run_ids this user has
 * started, purely as a navigation convenience. Every entry here still maps
 * to a real run_id returned by a real POST /workflows/run call — nothing
 * about the run's data itself is faked.
 */

const STORAGE_KEY = 'inbox_agent_run_history'
const MAX_ENTRIES = 25

function readHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeHistory(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useRunHistory() {
  const [history, setHistory] = useState(readHistory)

  useEffect(() => {
    writeHistory(history)
  }, [history])

  const addRun = useCallback(({ runId, query, maxResults, userId }) => {
    setHistory((prev) => {
      const next = [
        { runId, query, maxResults, userId, startedAt: new Date().toISOString() },
        ...prev.filter((entry) => entry.runId !== runId),
      ].slice(0, MAX_ENTRIES)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  return { history, addRun, clearHistory }
}
