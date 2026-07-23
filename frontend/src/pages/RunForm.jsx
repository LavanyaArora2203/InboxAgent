import { useState } from 'react'
import { startRun } from '../api.js'

function RunForm({ onStarted }) {
  const [maxResults, setMaxResults] = useState(10)
  const [query, setQuery] = useState('')
  const [userId, setUserId] = useState('default_user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await startRun({
        max_results: Number(maxResults),
        query: query || null,
        user_id: userId
      })
      onStarted(result.run_id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Inbox Agent</h1>
      {error && <div className="error-text">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Max results</label>
          <input
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value)}
            min="1"
          />
        </div>
        <div className="form-row">
          <label>Query (optional)</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. is:unread"
          />
        </div>
        <div className="form-row">
          <label>User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Starting...' : 'Run Workflow'}
        </button>
      </form>
    </div>
  )
}

export default RunForm