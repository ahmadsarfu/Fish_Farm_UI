export default function Empty({ icon='📭', text, sub }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <div className="empty-text">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  )
}
