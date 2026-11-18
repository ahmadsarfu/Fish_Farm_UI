import { request as req } from './client'

export const customerApi = {
  getAll: () => req('/api/customers'),

  create: (d) =>
    req('/api/customers', {
      method: 'POST',
      body: JSON.stringify(d)
    }),

  update: (id, d) =>
    req(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(d)
    }),

  delete: (id) =>
    req(`/api/customers/${id}`, {
      method: 'DELETE'
    }),
}
