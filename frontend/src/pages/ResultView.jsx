import { useEffect, useState } from 'react'
import { getResult } from '../api.js'
import EmailCard from '../components/EmailCard.jsx'

function ResultView({ runId }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getResult(runId)
      .then(setResult)
      .catch((err) => setError(err.message))
  }, [runId])

  return (
    <div>
      <h1>Run Result</h1>
      {error && <div className="error-text">{error}</div>}
      {!result && !error && <div className="status-text">Loading...</div>}

      {result && (
        <div>
          <div className="status-text">
            Status: {result.status} | Memories stored: {result.stored_memories_count}
          </div>

          {result.executed_emails.length === 0 && (
            <div className="empty-text">No emails processed.</div>
          )}

          {result.executed_emails.map((item) => (
            <EmailCard
              key={item.email_id}
              subject={item.subject}
              sender={item.sender}
              category={item.category}
              priority={item.priority}
              actions={item.actions_taken}
            >
              {item.requires_human_approval && (
                <div className="card-meta">Awaiting approval</div>
              )}
            </EmailCard>
          ))}

          {result.errors.length > 0 && (
            <div>
              <h2>Errors</h2>
              {result.errors.map((err, i) => (
                <div key={i} className="error-text">{err}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResultView