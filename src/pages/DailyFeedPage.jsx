import FeedManagementPage from '../components/feed/FeedManagementPage'
import { useAuth } from '../auth/context'

export default function DailyFeedPage() {
  const { user } = useAuth()
  return <FeedManagementPage role={user.role} />
}
