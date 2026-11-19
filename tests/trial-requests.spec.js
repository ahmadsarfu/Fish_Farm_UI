import { test, expect } from '@playwright/test'

const admin = { id: 1, username: 'admin', displayName: 'Sarfraz Ahmad', farmId: null, role: 'SUPER_ADMIN', farms: [] }
const row = { id: 8, ownerName: 'Mushtaque Ahmad', farmName: 'Ahmad Fish Farm', mobile: '+919876543210', email: '', status: 'PENDING', createdAt: '2026-11-19T10:00:00Z' }
async function mock(page, user = null) {
  const writes = []
  let status = 'PENDING'
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    const reply = (json, code = 200) => route.fulfill({ json, status: code })
    if (request.method() !== 'GET') writes.push({ path, body: request.postData() ? request.postDataJSON() : null })
    if (path === '/api/auth/me') return reply(user || { message: 'Please log in' }, user ? 200 : 401)
    if (path === '/api/auth/setup-status') return reply({ publicRegistrationEnabled: false })
    if (path === '/api/auth/csrf') return reply({ token: 'test-csrf' })
    if (path === '/api/auth/trial-requests') return reply({ message: 'Request received' })
    if (path === '/api/platform/trial-requests') return reply({ items: url.searchParams.get('status') === status ? [{ ...row, status }] : [], total: 1, pages: 1 })
    if (path.endsWith('/approve')) {
      status = 'APPROVED'
      return reply({ customer: { ownerName: row.ownerName, farmName: row.farmName }, activationPath: '/activate#token=private-test-token', expiresAt: '2026-11-26T10:00:00Z', purpose: 'ACTIVATION' })
    }
    if (path.endsWith('/reject')) { status = 'REJECTED'; return route.fulfill({ status: 204 }) }
    return reply([])
  })
  return writes
}

test('new visitor can request a trial with public signup disabled', async ({ page }) => {
  const writes = await mock(page)
  await page.goto('/login')
  await page.getByRole('link', { name: 'New farm? Request a free trial' }).click()
  await expect(page).toHaveURL('/request-trial')
  await page.getByLabel('Your name', { exact: true }).fill(row.ownerName)
  await page.getByLabel('Farm name', { exact: true }).fill(row.farmName)
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210')
  await page.getByRole('button', { name: 'Request free trial', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Request received!')
  expect(writes).toEqual([{ path: '/api/auth/trial-requests', body: { ownerName: row.ownerName, farmName: row.farmName, mobile: '9876543210', email: '' } }])
  await page.getByRole('link', { name: 'Back to login' }).click()
  await expect(page).toHaveURL('/login')
})

test('admin reviews plan limits and gets a private activation link', async ({ page }) => {
  const writes = await mock(page, admin)
  await page.goto('/admin/trial-requests')
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByLabel('Trial days', { exact: true }).fill('14')
  await page.getByLabel('Pond limit', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Approve & create activation link', exact: true }).click()
  await expect(page.getByLabel('Private activation link')).toHaveValue('http://127.0.0.1:4175/activate#token=private-test-token')
  await expect(page.getByText('No pending requests.', { exact: true })).toBeVisible()
  expect(writes[0]).toEqual({ path: '/api/platform/trial-requests/8/approve', body: { planName: 'Starter', trialDays: 14, pondLimit: 3, userLimit: 5 } })
  await page.getByLabel('Request status').selectOption('APPROVED')
  await expect(page.getByText('Manage links in Customers & plans')).toBeVisible()
})

test('admin rejects a request without generating an activation link', async ({ page }) => {
  const writes = await mock(page, admin)
  await page.goto('/admin/trial-requests')
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reject request', exact: true }).click()
  await expect(page.getByText('No pending requests.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Private activation link')).toHaveCount(0)
  expect(writes.map(write => write.path)).toEqual(['/api/platform/trial-requests/8/reject'])
})
