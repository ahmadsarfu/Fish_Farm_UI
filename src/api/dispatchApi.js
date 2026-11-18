import { request as req } from './client'

export const dispatchApi = {
  getAll:  ()   => req('/api/dispatches'),
  getById: (id) => req(`/api/dispatches/${id}`),
  create:  (d)  => req('/api/dispatches', { method:'POST', body:JSON.stringify(d) }),
   markAsDispatched: (id) =>req(`/api/dispatches/${id}/dispatch`, { method: 'PUT'}),
  delete:  (id) => req(`/api/dispatches/${id}`, { method:'DELETE' }),
}
