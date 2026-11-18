export default function SubscriptionNotice({ subscription }) {
  return <div className="page compact-workspace"><h1 className="page-title">Your farm access needs renewal</h1><div className="card settings-form"><h2 className="card-title">Your farm data is preserved</h2><p>Your {subscription.planName} plan is paused or expired{subscription.endsOn ? ` (access until ${subscription.endsOn})` : ''}. Contact the person who provided your account to renew access.</p><p className="page-desc">You can still manage your password, log out or switch to another farm.</p></div></div>
}
