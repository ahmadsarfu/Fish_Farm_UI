import { test, expect } from '@playwright/test'

const farms = [{ id: 1, name: 'First Farm' }, { id: 2, name: 'Second Farm' }]
const owner = { id: 1, username: 'owner', displayName: 'Farm Owner', farmId: 1, role: 'OWNER', farms, timeZone: 'Asia/Kolkata' }
const customer = { id: 7, name: 'Test Customer', mobile: '9876543210', customerType: 'RETAIL' }
const pond = { id: 1, pondName: 'Nursery Pond', pondNumber: 'P-1', status: 'ACTIVE', areaAcres: 1 }

// API fixtures isolate routing behavior from a live database and never modify real farm data.
async function mockFarm(page, initialUser = owner, overrides = {}) {
  let user = initialUser && { ...initialUser }
  let expired = false
  const calls = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    calls.push({ path, method: request.method(), body: request.postDataJSON() })
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4175', 'Access-Control-Allow-Credentials': 'true' }
    const json = (value, status = 200) => route.fulfill({ status, headers, json: value })
    if (path === '/api/auth/csrf') return json({ token: 'test-csrf' })
    if (path === '/api/auth/setup-status') return json({ legacyClaimAvailable: false, legacyDataWaiting: false })
    if (path === '/api/auth/login') { user = { ...owner }; expired = false; return json(user) }
    if (!user || expired) return json({ message: 'Session expired' }, 401)
    if (path === '/api/auth/me') return json(user)
    if (path === '/api/auth/logout') { user = null; return route.fulfill({ status: 204, headers }) }
    if (path === '/api/auth/select-farm') { user = { ...user, farmId: 2, role: 'LABOUR' }; return json(user) }
    if (Object.hasOwn(overrides, path)) return json(overrides[path])
    if (path === '/api/customers') return json([customer])
    if (path === '/api/ponds') return json(user.farmId === 2 ? [] : [pond])
    if (path === '/api/fish-types') return json([{ id: 1, name: 'Rohu', active: true }])
    if (path === '/api/sales/history') return json({ dispatches: [] })
    if (path === '/api/daily-feeds/summary') return json({})
    if (path === '/api/feeding-dashboard') return json({ ponds: [], completedSlots: 0, plannedSlots: 0, totalExpense: 0 })
    if (path === '/api/dispatches' && request.method() === 'POST') return json({ id: 8, ...request.postDataJSON() })
    return json([])
  })
  return { calls, expire: () => { expired = true } }
}

test('every page supports direct URL, reload, and active navigation', async ({ page }) => {
  await mockFarm(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const pages = {
    dashboard: 'Dashboard', 'fish-types': 'Fish Types', ponds: 'Ponds', customers: 'Customers',
    'daily-feed': 'Daily Feed', harvests: 'Harvest', inventory: 'Fish Stock Register',
    dispatches: 'Vehicle Dispatch', 'sales-history': 'Sales History', batches: 'Batches & Stage Costing',
    team: 'Team & Farm Settings', account: 'My Account',
  }
  for (const [path, title] of Object.entries(pages)) {
    await page.goto(`/${path}`)
    await expect(page.locator('.page-title')).toContainText(title)
    await expect(page.locator(`a[href="/${path}"]`)).toHaveAttribute('aria-current', 'page')
    await page.reload()
    await expect(page.locator('.page-title')).toContainText(title)
    await expect(page.locator('.spinner')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('sidebar, dashboard actions and browser Back/Forward update URLs', async ({ page }) => {
  await mockFarm(page)
  await page.goto('/')
  await expect(page).toHaveURL('/dashboard')
  await page.getByRole('link', { name: 'Ponds', exact: false }).click()
  await expect(page).toHaveURL('/ponds')
  await page.getByRole('link', { name: 'Customers', exact: false }).click()
  await expect(page).toHaveURL('/customers')
  await page.goBack()
  await expect(page.locator('.page-title')).toContainText('Ponds')
  await page.goForward()
  await expect(page.locator('.page-title')).toContainText('Customers')
  await page.getByRole('link', { name: 'Dashboard', exact: false }).click()
  await page.locator('.card').filter({ hasText: 'Aaj ki Vehicleyaan' }).getByRole('button', { name: /View All/ }).click()
  await expect(page).toHaveURL('/dispatches')
})

test('unauthenticated deep link returns to its page after login, then logout protects it', async ({ page }) => {
  await mockFarm(page, null)
  await page.goto('/ponds?view=active')
  await expect(page).toHaveURL('/login')
  await page.getByLabel('Mobile, email or username').fill('owner')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL('/ponds?view=active')
  await expect(page.locator('.page-title')).toContainText('Ponds')
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL('/login')
  await page.goBack()
  await expect(page.locator('.sidebar')).toHaveCount(0)
})

test('Labour cannot open restricted pages and Manager cannot open team settings', async ({ page }) => {
  const api = await mockFarm(page, { ...owner, role: 'LABOUR' })
  for (const path of ['/dashboard', '/customers', '/batches', '/team']) {
    await page.goto(path)
    await expect(page).toHaveURL('/daily-feed')
    await expect(page.locator('.page-title')).toContainText('Daily Feed')
  }
  await expect(page.locator('.sidebar-nav a')).toHaveCount(2)
  expect(api.calls.some(call => ['/api/customers', '/api/batches', '/api/team'].includes(call.path))).toBe(false)
  await page.unroute('**/api/**')
  await mockFarm(page, { ...owner, role: 'MANAGER' })
  await page.goto('/team')
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('a[href="/team"]')).toHaveCount(0)
})

test('Customer dispatch preselection survives reload and clearing the modal removes its query', async ({ page }) => {
  const api = await mockFarm(page)
  await page.goto('/customers')
  await page.getByRole('button', { name: '🚛 Dispatch', exact: true }).click()
  await expect(page).toHaveURL('/dispatches?customerId=7')
  await expect(page.locator('.modal select').first()).toHaveValue('7')
  await page.reload()
  await expect(page.locator('.modal select').first()).toHaveValue('7')
  await page.locator('.modal').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page).toHaveURL('/dispatches')
  await expect(page.locator('.modal')).toHaveCount(0)
  await page.goto('/dispatches?customerId=7')
  await page.locator('.modal input').filter({ visible: true }).last().fill('UP-32-AB-1234')
  await page.getByRole('button', { name: /Create Dispatch/ }).click()
  await expect(page).toHaveURL('/dispatches')
  expect(api.calls.find(call => call.path === '/api/dispatches' && call.method === 'POST')?.body).toMatchObject({ customerId: 7, vehicleNumber: 'UP-32-AB-1234' })
})

test('switching farms clears the previous form and enforces the new farm role', async ({ page }) => {
  await mockFarm(page)
  await page.goto('/dispatches?customerId=7')
  await expect(page.locator('.modal select').first()).toHaveValue('7')
  await page.getByLabel('Current farm').selectOption('2')
  await expect(page).toHaveURL('/daily-feed')
  await expect(page.locator('.modal')).toHaveCount(0)
  await expect(page.locator('.sidebar-farm-info')).toContainText('Second Farm')
  await expect(page.locator('.sidebar-nav a')).toHaveCount(2)
  await expect(page.getByText('Test Customer')).toHaveCount(0)
})

test('expired sessions return to login; unknown URLs show a useful recovery link', async ({ page }) => {
  const api = await mockFarm(page)
  await page.goto('/unknown-page')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to your dashboard' }).click()
  await expect(page).toHaveURL('/dashboard')
  await page.waitForLoadState('networkidle')
  api.expire()
  await page.getByRole('link', { name: 'Customers', exact: false }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
})

test('mobile checklist navigation keeps real links accessible', async ({ page }) => {
  await mockFarm(page, { ...owner, role: 'LABOUR' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/daily-feed')
  await expect(page.locator('.page-title')).toContainText('Daily Feed')
  await page.getByRole('link', { name: 'My Account', exact: false }).click()
  await expect(page).toHaveURL('/account')
  await expect(page.locator('.page-title')).toContainText('My Account')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})


test('dispatch detail still loads sessions and recorded basket weights', async ({ page }) => {
  const api = await mockFarm(page, owner, {
    '/api/dispatches': [{ id: 8, dispatchNumber: 'D-TEST-001', vehicleNumber: 'UP-32-AB-1234', status: 'LOADING', dispatchDate: '2026-11-18', customerName: customer.name }],
    '/api/weighing-sessions': [{ id: 9, dispatchId: 8, fishTypeId: 1, fishTypeName: 'Rohu', pondName: pond.pondName, closed: false }],
    '/api/weight-entries/session/9': [{ id: 10, basketNumber: 1, weightKg: 12.5 }],
  })
  await page.goto('/dispatches')
  await page.getByRole('button', { name: /Start \/ Continue Weighing/ }).click()
  await expect(page.locator('.modal-title')).toContainText('D-TEST-001')
  await page.getByRole('button', { name: '⚖️ Continue Weighing', exact: true }).click()
  await expect(page.locator('.basket-wt')).toHaveText('12.5')
  expect(api.calls.some(call => call.path === '/api/weight-entries/session/9')).toBe(true)
  await page.locator('.modal-close').click()
  await expect(page.locator('.modal')).toHaveCount(0)
  await expect(page).toHaveURL('/dispatches')
})

test('daily checklist saves its tick through the shared API client and feed records load', async ({ page }) => {
  const row = {
    pondId: 1, pondName: pond.pondName, pondNumber: 'P-1', active: true,
    config: { feedTypeId: 1, sizeMm: 1, feedName: 'Starter', feedActive: true, ratePerKg: 60, morningQtyKg: 2, eveningQtyKg: 2 },
    morning: { completed: false, entries: [] }, evening: { completed: false, entries: [] },
  }
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const dashboard = { date, ponds: [row], completedSlots: 0, plannedSlots: 2, totalExpense: 0 }
  const api = await mockFarm(page, owner, { '/api/feeding-dashboard': dashboard, '/api/feed-types': [{ id: 1, name: 'Starter', sizeMm: 1, ratePerKg: 60, active: true }] })
  await page.route('**/api/feeding-dashboard/1/slots/MORNING', route => route.fulfill({
    headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4175', 'Access-Control-Allow-Credentials': 'true' },
    json: { ...dashboard, completedSlots: 1, totalExpense: 120, ponds: [{ ...row, morning: { completed: true, quantityKg: 2, expense: 120, entries: [{ sizeMm: 1 }] } }] },
  }))
  await page.goto('/daily-feed')
  await page.getByRole('checkbox', { name: 'AM feeding for Nursery Pond' }).click()
  await expect(page.getByRole('checkbox', { name: 'AM feeding for Nursery Pond' })).toBeChecked()
  await expect(page.getByRole('status')).toContainText('feeding saved')
  await page.getByRole('button', { name: 'Feed Master & Records', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Feed Master (1–4 mm)', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Feed Master (1–4 mm)', exact: true }).click()
  await expect(page.getByText('Starter', { exact: true })).toBeVisible()
  expect(api.calls.some(call => call.path === '/api/daily-feeds')).toBe(true)
})


test('startup with a trailing slash keeps the route, query and active navigation', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await mockFarm(page)
  await page.goto('/ponds/?view=active#details')
  await expect(page).toHaveURL('/ponds?view=active#details')
  await expect(page.locator('.page-title')).toContainText('Ponds')
  await expect(page.locator('.topbar-page-name')).toContainText('Ponds')
  await expect(page.locator('a[href="/ponds"]')).toHaveAttribute('aria-current', 'page')
  expect(errors).toEqual([])
})

test('all farm pages use compact mobile navigation and keep the active link in view', async ({ page }) => {
  await mockFarm(page)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['dashboard', 'fish-types', 'ponds', 'customers', 'daily-feed', 'harvests', 'inventory', 'dispatches', 'sales-history', 'batches', 'team', 'account']) {
    await page.goto(`/${path}`)
    await expect(page.locator('.page-title')).toBeVisible()
    await expect.poll(() => page.locator('.sidebar').evaluate(node => node.getBoundingClientRect().height)).toBeLessThan(150)
    const heading = await page.locator('.page-title').boundingBox()
    expect(heading.y).toBeLessThan(400)
    const active = page.locator('.sidebar-nav [aria-current="page"]')
    await expect(active).toHaveAttribute('href', `/${path}`)
    const item = await active.boundingBox()
    const nav = await page.locator('.sidebar-nav').boundingBox()
    expect(item.x).toBeGreaterThanOrEqual(nav.x - 1)
    expect(item.x + item.width).toBeLessThanOrEqual(nav.x + nav.width + 1)
  }
  // Changing pages must not keep the previous page's vertical scroll position.
  await page.evaluate(() => {
    document.querySelector('.main').style.minHeight = '2000px'
    window.scrollTo(0, 800)
  })
  await page.evaluate(() => document.querySelector('.sidebar-nav a[href="/fish-types"]').click())
  await expect(page).toHaveURL('/fish-types')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('.page-title')).toContainText('Fish Types')
  await page.reload()
  await expect(page.locator('.page-title')).toContainText('Fish Types')
  expect((await page.locator('.sidebar').boundingBox()).height).toBeLessThan(150)
})
