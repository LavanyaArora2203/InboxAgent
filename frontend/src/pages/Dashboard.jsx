import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startRun } from '../services/api'
import { useRunHistory } from '../hooks/useRunHistory'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { EmptyState } from '../components/ui/StatePanel'
import { formatDateTime } from '../utils/formatters'

const DEFAULT_FORM = { maxResults: 10, query: '', userId: 'default_user' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { history, addRun, clearHistory } = useRunHistory()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        max_results: Number(form.maxResults) || 10,
        query: form.query.trim() ? form.query.trim() : null,
        user_id: form.userId.trim() || 'default_user',
      }
      const result = await startRun(payload)
      addRun({
        runId: result.run_id,
        query: payload.query,
        maxResults: payload.max_results,
        userId: payload.user_id,
      })
      navigate(`/runs/${result.run_id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container section dashboard">
      <div className="stack gap-xs" style={{ marginBottom: 32 }}>
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="text-muted">
          Start a new inbox run, or jump back into one you've already kicked off.
        </p>
      </div>

      <div className="dashboard-grid">
        <Card className="stack gap-md">
          <h3>Start a new run</h3>
          <form onSubmit={handleSubmit} className="stack gap-md">
            <div className="field">
              <label htmlFor="max-results">Max emails to process</label>
              <input
                id="max-results"
                type="number"
                min={1}
                max={50}
                className="input"
                value={form.maxResults}
                onChange={(event) => updateField('maxResults', event.target.value)}
              />
              <span className="field-hint">How many unread emails to pull from the inbox.</span>
            </div>

            <div className="field">
              <label htmlFor="query">Gmail search query (optional)</label>
              <input
                id="query"
                type="text"
                className="input"
                placeholder="e.g. is:unread newer_than:2d"
                value={form.query}
                onChange={(event) => updateField('query', event.target.value)}
              />
              <span className="field-hint">
                Leave blank to use the backend's default query.
              </span>
            </div>

            <div className="field">
              <label htmlFor="user-id">User ID</label>
              <input
                id="user-id"
                type="text"
                className="input"
                value={form.userId}
                onChange={(event) => updateField('userId', event.target.value)}
              />
              <span className="field-hint">Used to scope memory to a specific user.</span>
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} className="btn-block">
              {submitting ? 'Starting run…' : 'Start run'}
            </Button>
          </form>
        </Card>

        <div className="stack gap-md">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Recent runs</h3>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                Clear
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon="🗂️"
              title="No runs yet"
              description="Runs you start from this browser will show up here so you can jump back in."
            />
          ) : (
            <div className="stack gap-sm">
              {history.map((entry) => (
                <Card
                  key={entry.runId}
                  hover
                  className="run-history-item"
                  onClick={() => navigate(`/runs/${entry.runId}`)}
                >
                  <div className="stack gap-xs">
                    <span className="text-sm run-id-mono">{entry.runId}</span>
                    <span className="text-sm text-muted">
                      {entry.query ? `Query: ${entry.query}` : 'Default query'} ·{' '}
                      {entry.maxResults} emails
                    </span>
                    <span className="text-sm text-muted">{formatDateTime(entry.startedAt)}</span>
                  </div>
                  <Button variant="secondary" size="sm">
                    View →
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
