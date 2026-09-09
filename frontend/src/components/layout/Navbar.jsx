import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useBackendHealth } from '../../hooks/useBackendHealth'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

const HEALTH_META = {
  checking: { tone: 'neutral', label: 'Checking backend…' },
  online: { tone: 'success', label: 'Backend online' },
  offline: { tone: 'danger', label: 'Backend offline' },
}

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const health = useBackendHealth()
  const navigate = useNavigate()
  const healthMeta = HEALTH_META[health]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="navbar-brand" end>
          <span className="navbar-brand-mark">📬</span>
          <span>Inbox Agent</span>
        </NavLink>

        <nav className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Overview
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="navbar-actions">
          <Badge tone={healthMeta.tone} dot className="navbar-health">
            {healthMeta.label}
          </Badge>
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Exit demo
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
              Enter demo
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
