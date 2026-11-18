import { request } from './client'

export const feedApi = {
  getTypes: () => request('/api/feed-types'),
  getDashboard: date => request(`/api/feeding-dashboard?${new URLSearchParams({ date })}`),
  setSlot: (pondId, time, data) => request(`/api/feeding-dashboard/${pondId}/slots/${time}`, { method: 'PUT', body: JSON.stringify(data) }),
  saveConfig: (pondId, date, data) => request(`/api/pond-feed-configs/${pondId}?${new URLSearchParams({ date })}`, { method: 'PUT', body: JSON.stringify(data) }),
  getRecords: query => request(`/api/daily-feeds?${query}`),
  getSummary: query => request(`/api/daily-feeds/summary?${query}`),
  saveType: (id, data) => request(`/api/feed-types${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  saveRecord: (id, data) => request(`/api/daily-feeds${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deleteRecord: id => request(`/api/daily-feeds/${id}`, { method: 'DELETE' }),
}
