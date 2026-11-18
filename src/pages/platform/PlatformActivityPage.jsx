import { platformApi } from '../../api/platformApi'
import useData from '../../hooks/useData'
import Alert from '../../components/Alert'
import Loader from '../../components/Loader'

export default function PlatformActivityPage() {
  const { data, error, loading } = useData(platformApi.activity)
  return <div className="page compact-workspace"><h1 className="page-title">Platform activity</h1><p className="page-desc">Recent customer invitations, activations and access changes.</p><Alert msg={error} /><div className="card table-wrap">{loading ? <Loader /> : <table><thead><tr><th>Time</th><th>Farm</th><th>Action</th><th>Account</th></tr></thead><tbody>{(data?.content || []).map(event => <tr key={event.id}><td>{new Date(event.time).toLocaleString('en-IN')}</td><td>#{event.farmId}</td><td>{event.action.toLowerCase().replaceAll('_', ' ')}</td><td>#{event.actorId}</td></tr>)}</tbody></table>}</div></div>
}
