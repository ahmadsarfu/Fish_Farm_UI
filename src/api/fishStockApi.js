import { request as req } from './client'

export const fishStockApi = {
  getAll: () => req('/api/fish-stock'),

  create: (d) =>
    req('/api/fish-stock', {
      method:'POST',
      body:JSON.stringify(d)
    }),

  update: (id, d) =>
    req(`/api/fish-stock/${id}`, {
      method:'PUT',
      body:JSON.stringify(d)
    }),

  delete: (id) =>
    req(`/api/fish-stock/${id}`, {
      method:'DELETE'
    }),
}
