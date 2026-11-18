import { request as req } from './client'

export const weightApi = {
  getBySession: (sid) => req(`/api/weight-entries/session/${sid}`),
  create:       (d)   => req('/api/weight-entries', { method:'POST', body:JSON.stringify(d) }),
  delete:       (id)  => req(`/api/weight-entries/${id}`, { method:'DELETE' }),
}
