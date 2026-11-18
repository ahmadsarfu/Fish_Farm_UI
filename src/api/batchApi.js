import { request } from './client'

export const batchApi = {
  getAll: () => request('/api/batches'),
  getById: id => request(`/api/batches/${id}`),
  create: data => request('/api/batches', { method: 'POST', body: JSON.stringify(data) }),
  recordOperation: (stageId, operation, data) => request(`/api/batch-stages/${stageId}/${operation}`, { method: 'POST', body: JSON.stringify(data) }),
}
