const BASE_URL = 'http://localhost:8000'

export async function startRun({ max_results, query, user_id }) {
  const res = await fetch(`${BASE_URL}/workflows/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_results, query, user_id })
  })
  if (!res.ok) throw new Error(`Failed to start run (${res.status})`)
  return res.json()
}

export async function getStatus(runId) {
  const res = await fetch(`${BASE_URL}/workflows/${runId}/status`)
  if (!res.ok) throw new Error(`Failed to get status (${res.status})`)
  return res.json()
}

export async function getApprovals(runId) {
  const res = await fetch(`${BASE_URL}/workflows/${runId}/approvals`)
  if (!res.ok) throw new Error(`Failed to get approvals (${res.status})`)
  return res.json()
}

export async function submitApprovals(runId, decisions) {
  const res = await fetch(`${BASE_URL}/workflows/${runId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions })
  })
  if (!res.ok) throw new Error(`Failed to submit approvals (${res.status})`)
  return res.json()
}

export async function getResult(runId) {
  const res = await fetch(`${BASE_URL}/workflows/${runId}/result`)
  if (!res.ok) throw new Error(`Failed to get result (${res.status})`)
  return res.json()
}