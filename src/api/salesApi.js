import { request as req } from './client'

export const salesApi = {getHistory: () => req('/api/sales/history'),
}
