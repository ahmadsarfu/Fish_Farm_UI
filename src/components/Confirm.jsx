import Modal from './Modal'

export default function Confirm({ open, onClose, onOk, loading, title='Delete this record?', msg }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="modal-body">
        <p style={{fontSize:16,color:'var(--ink2)',lineHeight:1.6}}>
          {msg || 'This record will be permanently deleted. Are you sure?'}
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={onOk} disabled={loading}>{loading ? 'Deleting...' : '🗑 Delete'}</button>
      </div>
    </Modal>
  )
}
