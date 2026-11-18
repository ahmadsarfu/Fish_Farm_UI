export const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏡', group: 'Overview' },
  { id: 'fish-types', label: 'Fish Types', icon: '🐟', group: 'Master Data' },
  { id: 'ponds', label: 'Ponds', icon: '🏊', group: 'Master Data' },
  { id: 'customers', label: 'Customers', icon: '👥', group: 'Master Data' },
  { id: 'daily-feed', label: 'Daily Feed', icon: '🌾', group: 'Actions Karo' },
  { id: 'harvests', label: 'Harvest', icon: '🎣', group: 'Actions Karo' },
  { id: 'inventory', label: 'Fish Stock', icon: '📦', group: 'Actions Karo' },
  { id: 'dispatches', label: 'Dispatch (Vehicle)', icon: '🚛', group: 'Actions Karo' },
  { id: 'sales-history', label: 'Sales History', icon: '💰', group: 'Reports' },
  { id: 'batches', label: 'Batches & Costing', icon: '🐠', group: 'Reports' },
  { id: 'team', label: 'Team & Settings', icon: '⚙️', group: 'Administration' },
  { id: 'account', label: 'My Account', icon: '👤', group: 'Administration' },
]

export const homePath = role => role === 'LABOUR' ? '/daily-feed' : '/dashboard'
export function canAccess(role, page) {
  if (!['OWNER', 'MANAGER', 'LABOUR'].includes(role)) return false
  if (role === 'LABOUR') return ['daily-feed', 'account'].includes(page)
  return page !== 'team' || role === 'OWNER'
}
