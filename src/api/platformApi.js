import { request } from './client'

export const platformApi = {
  requestTrial: data => request('/api/auth/trial-requests', { method: 'POST', body: JSON.stringify(data) }),
  trialRequests: (status, page) => request(`/api/platform/trial-requests?${new URLSearchParams({ status, page, size: 20 })}`),
  approveTrial: (id, data) => request(`/api/platform/trial-requests/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  rejectTrial: id => request(`/api/platform/trial-requests/${id}/reject`, { method: 'POST' }),
  customers: (search, page) => request(`/api/platform/customers?${new URLSearchParams({ search, page, size: 20 })}`),
  invite: data => request('/api/platform/customers', { method: 'POST', body: JSON.stringify(data) }),
  activationLink: id => request(`/api/platform/customers/${id}/activation-link`, { method: 'POST' }),
  passwordReset: id => request(`/api/platform/customers/${id}/password-reset`, { method: 'POST' }),
  updateSubscription: (id, data) => request(`/api/platform/customers/${id}/subscription`, { method: 'PUT', body: JSON.stringify(data) }),
  activity: () => request('/api/platform/activity?size=20'),
  invitation: token => request('/api/auth/invitation', { method: 'POST', body: JSON.stringify({ token }) }),
  activate: data => request('/api/auth/activate', { method: 'POST', body: JSON.stringify(data) }),
}
