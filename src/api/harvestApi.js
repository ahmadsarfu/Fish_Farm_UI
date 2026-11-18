import { request as req } from './client'

export const harvestApi = {
  getAll:  ()   => req('/api/harvests'),
  getById: (id) => req(`/api/harvests/${id}`),
  create:  (d)  => req('/api/harvests', { method:'POST', body:JSON.stringify(d) }),
  delete:  (id) => req(`/api/harvests/${id}`, { method:'DELETE' }),
}
