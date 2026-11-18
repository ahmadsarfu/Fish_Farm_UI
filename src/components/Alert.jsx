export default function Alert({ type='error', msg, onClose }) {
  if (!msg) return null
  const icons = { error:'⚠️', success:'✅', info:'ℹ️' }
  return (
    <div className={`alert alert-${type}`}>
      <span>{icons[type]}</span>
      <span style={{flex:1}}>{msg}</span>
      {onClose && <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:16,fontWeight:700}}>✕</button>}
    </div>
  )
}
