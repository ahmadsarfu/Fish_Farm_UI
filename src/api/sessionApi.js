import { request as req } from './client'

export const sessionApi = {
  create: (d)  => req('/api/weighing-sessions', { method:'POST', body:JSON.stringify(d) }),
  close:  (id, body) => req(`/api/weighing-sessions/${id}/close`, { method:'PUT', body:JSON.stringify(body) }),
  getAll: ()   => req('/api/weighing-sessions'),
}
