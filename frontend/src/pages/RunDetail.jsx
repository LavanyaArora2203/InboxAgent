import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getApprovals, getRunResult, getRunStatus, submitApprovals } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StatePanel'
import {
  actionLabel,
  CATEGORY_TONE,
  PRIORITY_TONE,
  runStatusMeta,
} from '../utils/formatters'

const ACTIVE_STATUSES = new Set(['processing', 'awaiting_approval'])

export default function RunDetail() {
  const { runId } = useParams()

  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [approvals, setApprovals] = useState(null)
  const [approvalsError, setApprovalsError] = useState(null)
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [decisions, setDecisions] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [result, setResult] = useState(null)
  const [resultError, setResultError] = useState(null)
  const [resultLoading, setResultLoading] = useState(false)

  // ---- status polling -----------------------------------------------

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getRunStatus(runId)
      setStatus(data)
      setStatusError(null)
    } catch (err) {
      setStatusError(err.message)
    } finally {
      setStatusLoading(false)
    }
  }, [runId])

  usePolling(fetchStatus, {
    intervalMs: 3000,
    enabled: !status || ACTIVE_STATUSES.has(status.status),
  })

  // ---- approvals -------------------------------------------------------

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true)
    setApprovalsError(null)
    try {
      const data = await getApprovals(runId)
      setApprovals(data)
      setDecisions({})
    } catch (err) {
      setApprovalsError(err.message)
    } finally {
      setApprovalsLoading(false)
    }
  }, [runId])

  useEffect(() => {
    // Runs once whenever the run's status changes, guarded so it never
    // loops — intentional, not an accidental render cascade.
    if (status?.status === 'awaiting_approval' && approvals === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchApprovals()
    }
    if (status?.status !== 'awaiting_approval' && approvals !== null) {
      setApprovals(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status])

  function setDecision(emailId, approved) {
    setDecisions((prev) => ({ ...prev, [emailId]: approved }))
  }

  async function handleSubmitDecisions() {
    if (!approvals) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = approvals.map((item) => ({
        email_id: item.email_id,
        approved: Boolean(decisions[item.email_id]),
      }))
      await submitApprovals(runId, payload)
      setApprovals(null)
      await fetchStatus()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- results -----------------------------------------------------

  const fetchResult = useCallback(async () => {
    setResultLoading(true)
    setResultError(null)
    try {
      const data = await getRunResult(runId)
      setResult(data)
    } catch (err) {
      setResultError(err.message)
    } finally {
      setResultLoading(false)
    }
  }, [runId])

  useEffect(() => {
    // Fires once when the run transitions to "completed"; guarded by
    // `result === null` so it never loops.
    if (status?.status === 'completed' && result === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchResult()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status])

  // ---- render --------------------------------------------------------

  if (statusLoading) {
    return (
      <div className="container section">
        <LoadingState label="Loading run status…" />
      </div>
    )
  }

  if (statusError && !status) {
    return (
      <div className="container section">
        <ErrorState title="Couldn't load this run" description={statusError} onRetry={fetchStatus} />
      </div>
    )
  }

  const meta = runStatusMeta(status?.status)

  return (
    <div className="container section stack gap-lg">
      <div className="stack gap-xs">
        <Link to="/dashboard" className="text-sm text-muted">
          ← Back to dashboard
        </Link>
        <div className="row gap-sm run-detail-header">
          <h1 className="run-detail-title">Run</h1>
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </div>
        <span className="text-sm run-id-mono text-muted">{runId}</span>
      </div>

      <div className="grid grid-3">
        <Card className="stat-card">
          <span className="stat-label">Total emails</span>
          <span className="stat-value">{status?.total_emails ?? '—'}</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Pending approval</span>
          <span className="stat-value">{status?.pending_approval_count ?? '—'}</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Status</span>
          <span className="stat-value stat-value-sm">{meta.label}</span>
        </Card>
      </div>

      {status?.status === 'error' && (
        <ErrorState
          title="This run hit an error"
          description={status.error || 'No further detail was returned by the backend.'}
          onRetry={fetchStatus}
        />
      )}

      {status?.status === 'processing' && (
        <Card className="stack gap-sm text-center">
          <LoadingState label="Agents are working through the inbox…" />
          <p className="text-sm text-muted">
            This page polls automatically — no need to refresh.
          </p>
        </Card>
      )}

      {status?.status === 'awaiting_approval' && (
        <ApprovalsPanel
          approvals={approvals}
          loading={approvalsLoading}
          error={approvalsError}
          onRetry={fetchApprovals}
          decisions={decisions}
          setDecision={setDecision}
          onSubmit={handleSubmitDecisions}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      {status?.status === 'completed' && (
        <ResultsPanel result={result} loading={resultLoading} error={resultError} onRetry={fetchResult} />
      )}
    </div>
  )
}

function ApprovalsPanel({
  approvals,
  loading,
  error,
  onRetry,
  decisions,
  setDecision,
  onSubmit,
  submitting,
  submitError,
}) {
  if (loading) return <LoadingState label="Loading items awaiting approval…" />
  if (error) return <ErrorState title="Couldn't load approvals" description={error} onRetry={onRetry} />
  if (!approvals || approvals.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="Nothing waiting on you right now"
        description="This will update automatically if new items need approval."
      />
    )
  }

  const decidedCount = approvals.filter((item) => decisions[item.email_id] !== undefined).length
  const readyToSubmit = decidedCount === approvals.length

  return (
    <div className="stack gap-md">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Needs your approval ({approvals.length})</h3>
        <span className="text-sm text-muted">
          {decidedCount}/{approvals.length} decided
        </span>
      </div>

      <div className="stack gap-sm">
        {approvals.map((item) => {
          const decision = decisions[item.email_id]
          return (
            <Card key={item.email_id} className="approval-item stack gap-sm">
              <div className="row approval-item-top">
                <div className="stack gap-xs" style={{ minWidth: 0 }}>
                  <h4 className="truncate">{item.subject || '(no subject)'}</h4>
                  <span className="text-sm text-muted truncate">{item.sender}</span>
                </div>
                <div className="row gap-xs" style={{ flexShrink: 0 }}>
                  <Badge tone={CATEGORY_TONE[item.category] || 'neutral'}>{item.category}</Badge>
                  <Badge tone={PRIORITY_TONE[item.priority] || 'neutral'}>{item.priority}</Badge>
                </div>
              </div>

              <p className="text-sm text-muted">{item.reasoning}</p>

              <div className="row gap-xs" style={{ flexWrap: 'wrap' }}>
                {item.proposed_actions.map((action) => (
                  <Badge key={action} tone="brand">
                    {actionLabel(action)}
                  </Badge>
                ))}
              </div>

              <div className="row gap-sm approval-decision-row">
                <Button
                  variant={decision === true ? 'success' : 'secondary'}
                  size="sm"
                  onClick={() => setDecision(item.email_id, true)}
                >
                  ✓ Approve
                </Button>
                <Button
                  variant={decision === false ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => setDecision(item.email_id, false)}
                >
                  ✕ Reject
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {submitError && (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>
          {submitError}
        </p>
      )}

      <Button onClick={onSubmit} disabled={!readyToSubmit} loading={submitting} className="btn-block">
        {readyToSubmit
          ? 'Submit decisions'
          : `Decide on all ${approvals.length} items to continue`}
      </Button>
    </div>
  )
}

function ResultsPanel({ result, loading, error, onRetry }) {
  if (loading) return <LoadingState label="Loading results…" />
  if (error) return <ErrorState title="Couldn't load results" description={error} onRetry={onRetry} />
  if (!result) return null

  return (
    <div className="stack gap-md">
      <div className="grid grid-2">
        <Card className="stat-card">
          <span className="stat-label">Emails processed</span>
          <span className="stat-value">{result.executed_emails.length}</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Memories stored</span>
          <span className="stat-value">{result.stored_memories_count}</span>
        </Card>
      </div>

      {result.errors.length > 0 && (
        <Card className="stack gap-xs" style={{ borderColor: 'rgba(248,113,113,0.35)' }}>
          <h4 style={{ color: 'var(--danger)' }}>Errors during this run</h4>
          <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: 18 }}>
            {result.errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </Card>
      )}

      <h3>Processed emails</h3>
      {result.executed_emails.length === 0 ? (
        <EmptyState icon="📭" title="No emails were processed in this run" />
      ) : (
        <div className="stack gap-sm">
          {result.executed_emails.map((email) => (
            <Card key={email.email_id} className="stack gap-sm">
              <div className="row approval-item-top">
                <div className="stack gap-xs" style={{ minWidth: 0 }}>
                  <h4 className="truncate">{email.subject || '(no subject)'}</h4>
                  <span className="text-sm text-muted truncate">{email.sender}</span>
                </div>
                <div className="row gap-xs" style={{ flexShrink: 0 }}>
                  <Badge tone={CATEGORY_TONE[email.category] || 'neutral'}>{email.category}</Badge>
                  <Badge tone={PRIORITY_TONE[email.priority] || 'neutral'}>{email.priority}</Badge>
                </div>
              </div>

              <div className="row gap-xs" style={{ flexWrap: 'wrap' }}>
                {email.actions_taken.length > 0 ? (
                  email.actions_taken.map((action) => (
                    <Badge key={action} tone="success">
                      {actionLabel(action)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted">No actions taken</span>
                )}
                {email.requires_human_approval && <Badge tone="warning">Was reviewed by you</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
