import { request as req } from './client'

export const fishApi = {
  getAll:  ()      => req('/api/fish-types'),
  create:  (d)     => req('/api/fish-types', { method:'POST', body:JSON.stringify(d) }),
  update:  (id, d) => req(`/api/fish-types/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  delete:  (id)    => req(`/api/fish-types/${id}`, { method:'DELETE' }),
}
