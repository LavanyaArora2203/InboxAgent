import Button from './Button'
import Spinner from './Spinner'

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state-panel" role="status">
      <Spinner size="lg" />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="state-panel">
      <span className="state-panel-icon" aria-hidden="true">
        {icon}
      </span>
      <h4>{title}</h4>
      {description && <p className="text-sm">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="state-panel state-error" role="alert">
      <span className="state-panel-icon" aria-hidden="true">
        ⚠️
      </span>
      <h4>{title}</h4>
      {description && <p className="text-sm">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
