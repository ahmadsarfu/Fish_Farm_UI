let businessZone = 'Asia/Kolkata'
export function setBusinessZone(zone) { businessZone = zone || 'Asia/Kolkata' }
export function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: businessZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = type => parts.find(part => part.type === type).value
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function businessTimeZone() { return businessZone }
