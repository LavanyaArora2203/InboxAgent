/**
 * services/api.js
 *
 * Single place where this app talks to the FastAPI backend
 * (see backend `api/routes.py`). No other file should call axios/fetch
 * directly — components and pages import functions from here instead.
 *
 * Endpoints wired to the real backend (nothing here is mocked):
 *   GET  /health
 *   POST /workflows/run
 *   GET  /workflows/{run_id}/status
 *   GET  /workflows/{run_id}/approvals
 *   POST /workflows/{run_id}/approve
 *   GET  /workflows/{run_id}/result
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Normalizes any axios error into a plain, predictable shape so pages
 * never need to know about axios internals.
 */
function normalizeError(error) {
  if (error.response) {
    // Server responded with a non-2xx status.
    const detail = error.response.data?.detail
    return {
      status: error.response.status,
      message:
        typeof detail === 'string'
          ? detail
          : detail?.[0]?.msg || `Request failed with status ${error.response.status}`,
    }
  }
  if (error.request) {
    // Request went out, no response came back (backend down, CORS, network).
    return {
      status: 0,
      message:
        'Could not reach the backend. It may be asleep (free-tier cold start can take ~30-60s) or offline.',
    }
  }
  return { status: -1, message: error.message || 'Unexpected error' }
}

async function request(promise) {
  try {
    const response = await promise
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

// --------------------------------------------------------------------------
// Health
// --------------------------------------------------------------------------

export function getHealth() {
  return request(apiClient.get('/health'))
}

// --------------------------------------------------------------------------
// Workflow runs
// --------------------------------------------------------------------------

/**
 * @param {{ max_results?: number, query?: string|null, user_id?: string }} payload
 * @returns {Promise<{ run_id: string, status: string }>}
 */
export function startRun(payload) {
  return request(apiClient.post('/workflows/run', payload))
}

/**
 * @param {string} runId
 * @returns {Promise<{ run_id, status, total_emails, pending_approval_count, error }>}
 */
export function getRunStatus(runId) {
  return request(apiClient.get(`/workflows/${runId}/status`))
}

/**
 * @param {string} runId
 * @returns {Promise<Array<{ email_id, subject, sender, category, priority, proposed_actions, reasoning }>>}
 */
export function getApprovals(runId) {
  return request(apiClient.get(`/workflows/${runId}/approvals`))
}

/**
 * @param {string} runId
 * @param {Array<{ email_id: string, approved: boolean }>} decisions
 */
export function submitApprovals(runId, decisions) {
  return request(apiClient.post(`/workflows/${runId}/approve`, { decisions }))
}

/**
 * @param {string} runId
 * @returns {Promise<{ run_id, status, executed_emails, stored_memories_count, errors }>}
 */
export function getRunResult(runId) {
  return request(apiClient.get(`/workflows/${runId}/result`))
}
