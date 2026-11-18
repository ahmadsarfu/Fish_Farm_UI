import { Link } from 'react-router-dom'

export default function FarmGettingStarted() {
  return <section className="card settings-form farm-start"><h2 className="card-title">Welcome. Let's set up your farm.</h2><p className="page-desc">Start with your ponds and fish types. Then set feeding quantities and add your team.</p><div className="farm-start-links">
    <Link className="btn btn-primary" to="/ponds">1. Add ponds</Link>
    <Link className="btn btn-ghost" to="/fish-types">2. Add fish types</Link>
    <Link className="btn btn-ghost" to="/daily-feed">3. Set up feeding</Link>
    <Link className="btn btn-ghost" to="/team">4. Add your team</Link>
  </div></section>
}
