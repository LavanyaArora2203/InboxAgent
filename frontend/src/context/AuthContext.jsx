import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * AuthContext — a client-side "demo access gate", not real authentication.
 *
 * The backend (api/routes.py) exposes no login/user/token endpoints, so
 * there is nothing to authenticate against server-side. Rather than fake a
 * login endpoint, this simply gates the UI behind a single access code
 * (VITE_DEMO_ACCESS_CODE) so a public demo link doesn't let random visitors
 * trigger LLM-costing workflow runs. It intentionally does not claim to be
 * secure — do not reuse this pattern for anything with real user data.
 */

const SESSION_KEY = 'inbox_agent_demo_authed'
const DEMO_CODE = import.meta.env.VITE_DEMO_ACCESS_CODE || 'inbox-agent-demo'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  )

  const login = useCallback((code) => {
    const ok = code.trim() === DEMO_CODE
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setIsAuthenticated(true)
    }
    return ok
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Small context file; splitting the hook into its own file for one rule
// isn't worth the extra indirection here.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
