import { useRef, useState } from 'react'

export default function ActivationLink({ invitation, onClose }) {
  const [copied, setCopied] = useState(false)
  const input = useRef(null)
  const reset = invitation.purpose === 'PASSWORD_RESET'
  const link = new URL(invitation.activationPath, window.location.origin).href
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true) }
    catch { input.current?.focus(); input.current?.select() }
  }
  return <section className="card settings-form activation-result" aria-label="Customer activation link">
    <h2 className="card-title">{reset ? 'Share the password reset link.' : 'Customer added. Share their activation link.'}</h2>
    <p>{invitation.customer.ownerName} can set a password and open {invitation.customer.farmName}.</p>
    <label className="form-group">{reset ? 'Private password reset link' : 'Private activation link'}<input ref={input} readOnly value={link} onFocus={event => event.target.select()} /></label>
    <p className="page-desc">Share this link privately with the customer. It expires on {new Date(invitation.expiresAt).toLocaleDateString('en-IN')}. A new link replaces the previous one.</p>
    <div className="feed-actions"><button className="btn btn-primary" onClick={copy}>{copied ? 'Copied' : reset ? 'Copy reset link' : 'Copy activation link'}</button><button className="btn btn-ghost" onClick={onClose}>Done</button></div>
    {!navigator.clipboard && <p className="page-desc">Select the link and copy it manually on this connection.</p>}
  </section>
}
