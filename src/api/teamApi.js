import { request } from './client'

export const teamApi = {
  getAll: () => request('/api/team'),
  getAudit: () => request('/api/audit'),
  save: (id, data) => request(`/api/team${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
}
