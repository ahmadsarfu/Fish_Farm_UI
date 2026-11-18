import { request as req } from './client'

export const pondApi = {
  getAll:  ()      => req('/api/ponds'),
  create:  (d)     => req('/api/ponds', { method:'POST', body:JSON.stringify(d) }),
  update:  (id, d) => req(`/api/ponds/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  delete:  (id)    => req(`/api/ponds/${id}`, { method:'DELETE' }),
}
