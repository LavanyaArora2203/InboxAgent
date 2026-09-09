import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  if (isAuthenticated) {
    navigate(redirectTo, { replace: true })
    return null
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!code.trim()) {
      setError('Enter the access code to continue.')
      return
    }

    const ok = login(code)
    if (ok) {
      navigate(redirectTo, { replace: true })
    } else {
      setError('That code is not correct. Try again.')
    }
  }

  return (
    <div className="page-center container">
      <Card className="login-card">
        <div className="stack gap-xs text-center" style={{ marginBottom: 24 }}>
          <span style={{ fontSize: '2rem' }}>🔐</span>
          <h2>Demo access</h2>
          <p className="text-sm text-muted">
            This demo triggers real LLM calls against a live inbox, so it sits behind a single
            shared access code rather than being open to anyone with the link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="stack gap-md">
          <div className="field">
            <label htmlFor="access-code">Access code</label>
            <input
              id="access-code"
              className="input"
              type="password"
              autoComplete="off"
              placeholder="Enter access code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
          </div>

          <Button type="submit" className="btn-block">
            Continue
          </Button>
        </form>

        <p className="text-sm text-muted" style={{ marginTop: 20 }}>
          Don't have a code? Reach out to me directly and I'll happily walk you through a live
          run.
        </p>
      </Card>
    </div>
  )
}
