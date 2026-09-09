# Inbox Agent — Frontend

React + Vite UI for the Inbox Agent multi-agent email automation backend
(LangGraph + FastAPI). Talks only to the real backend endpoints in
`api/routes.py` — nothing in this app uses mock/fake data.

## Stack

- React 19 + Vite
- React Router (client-side routing)
- Axios (all calls centralized in `src/services/api.js`)
- Plain CSS with a small design-system file (`src/index.css` + `ui.css`)

## Getting started

```bash
cd frontend
cp .env.example .env.local   # set VITE_API_BASE_URL to your backend
npm install
npm run dev
```

The backend must be running (see the root project README) and reachable at
`VITE_API_BASE_URL`. CORS is already open (`allow_origins=["*"]`) in
`api/main.py`.

## Pages

| Route            | Purpose |
|-------------------|---------|
| `/`               | Public landing page — explains the multi-agent pipeline (fetch → guardrails → understand → classify → prioritize → plan → approve → execute → audit) for anyone viewing the demo cold. |
| `/login`          | Demo access gate (see **Auth** below). |
| `/dashboard`      | Protected. Form to start a new run (`POST /workflows/run`) plus a list of runs started from this browser. |
| `/runs/:runId`    | Protected. Polls `GET /workflows/{id}/status` every 3s. Shows an approval UI when the run is `awaiting_approval` (`GET/POST .../approvals` / `.../approve`), and results when `completed` (`GET .../result`). |
| `*`               | 404. |

Every page implements four states explicitly: loading, empty, success, and
error (see `src/components/ui/StatePanel.jsx`).

## Auth

The backend has **no authentication of its own** — no login, user, or token
endpoints in `api/routes.py`. Rather than fabricate a fake login flow against
a backend that doesn't support one, `src/context/AuthContext.jsx` implements
a lightweight **demo access gate**: a single shared code
(`VITE_DEMO_ACCESS_CODE`), checked client-side, stored in `sessionStorage`.

This exists so a public resume/portfolio link doesn't let random visitors
trigger real LLM calls against a live inbox — it is *not* meant to be secure,
and shouldn't be treated as a model for real user auth.

## Run history

The backend also has no "list all runs" endpoint — a run is only queryable
once you already have its `run_id`. `src/hooks/useRunHistory.js` keeps a
small local record (in `localStorage`) of run IDs started from this browser,
purely for navigation convenience. Every entry is a real `run_id` returned by
a real `POST /workflows/run` call.

## Project structure

```
src/
  services/api.js       — the only file that calls axios
  context/AuthContext.jsx
  hooks/                — usePolling, useRunHistory, useBackendHealth
  components/
    ui/                  — Button, Card, Badge, Spinner, StatePanel
    layout/              — Navbar, Footer, AppShell
    ProtectedRoute.jsx
  pages/                 — Landing, Login, Dashboard, RunDetail, NotFound
  utils/formatters.js    — maps backend enums (category/priority/action/status) to labels
```

## Deploying (Vercel)

1. Push this repo (or just `frontend/`) to GitHub.
2. Import into Vercel, set the root directory to `frontend` if the backend
   lives alongside it.
3. Set environment variables in the Vercel project settings:
   - `VITE_API_BASE_URL` → your deployed backend URL (e.g. Render)
   - `VITE_DEMO_ACCESS_CODE` → a code you'll share on your resume/portfolio
4. Update `allow_origins` in the backend's `api/main.py` to your Vercel
   domain instead of `"*"` before sharing the link publicly.
