// Maps backend enum values (agents/classifier.py Category, agents/priority.py
// PriorityLevel, agents/planner.py ActionType, api/schemas.py status) to
// display labels and tones. Every value below is one the backend can
// actually send — see the docstring links next to each map.

// agents/priority.py: PriorityLevel = Literal["Urgent", "High", "Medium", "Low"]
export const PRIORITY_TONE = {
  Urgent: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
}

// agents/classifier.py: Category = Literal["Work", "Personal", "Finance",
//   "Promotion", "Spam", "Job", "Interview", "Newsletter", "Bills",
//   "Shopping", "Social"]
export const CATEGORY_TONE = {
  Work: 'brand',
  Personal: 'info',
  Finance: 'success',
  Promotion: 'neutral',
  Spam: 'danger',
  Job: 'brand',
  Interview: 'brand',
  Newsletter: 'neutral',
  Bills: 'warning',
  Shopping: 'info',
  Social: 'info',
}

// agents/planner.py: ActionType — used to render a friendly label for each
// proposed/executed action.
export const ACTION_LABELS = {
  reply: 'Reply',
  archive: 'Archive',
  delete: 'Delete',
  mark_read: 'Mark read',
  flag: 'Flag',
  create_task: 'Create task',
  schedule_meeting: 'Schedule meeting',
  notify_slack: 'Notify Slack',
  forward: 'Forward',
  do_nothing: 'No action',
  human_approval: 'Needs approval',
}

export function actionLabel(action) {
  return ACTION_LABELS[action] || action
}

// api/schemas.py: status = Literal["processing", "awaiting_approval",
//   "completed", "error"]
export const RUN_STATUS_META = {
  processing: { label: 'Processing', tone: 'info' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  error: { label: 'Error', tone: 'danger' },
}

export function runStatusMeta(status) {
  return RUN_STATUS_META[status] || { label: status || 'Unknown', tone: 'neutral' }
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return isoString
  }
}
