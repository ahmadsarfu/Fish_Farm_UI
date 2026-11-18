import { request } from './client'

export const authApi = {
  me: () => request('/api/auth/me'),
  setupStatus: () => request('/api/auth/setup-status'),
  login: data => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: data => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  selectFarm: farmId => request('/api/auth/select-farm', { method: 'POST', body: JSON.stringify({ farmId: Number(farmId) }) }),
  changePassword: data => request('/api/auth/password', { method: 'POST', body: JSON.stringify(data) }),
  createFarm: name => request('/api/auth/farms', { method: 'POST', body: JSON.stringify({ name }) }),
}
