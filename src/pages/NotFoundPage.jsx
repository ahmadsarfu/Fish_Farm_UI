import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { homePath } from '../routing/navigation'

export default function NotFoundPage() {
  const { user } = useAuth()
  return <div className="page"><h1>Page not found</h1><p>This page does not exist.</p><Link className="btn btn-primary" to={homePath(user.role)}>Go to your dashboard</Link></div>
}
