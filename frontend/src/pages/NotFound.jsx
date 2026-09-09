import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="container not-found">
      <span style={{ fontSize: '2.5rem' }}>🧭</span>
      <h2>Page not found</h2>
      <p className="text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button variant="secondary">Back to overview</Button>
      </Link>
    </div>
  )
}
