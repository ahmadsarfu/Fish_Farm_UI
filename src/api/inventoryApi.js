import { request as req } from './client'

export const invApi = {
  getAll: () => req('/api/inventory'),
}
