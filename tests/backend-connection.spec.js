import { test, expect } from '@playwright/test'

const owner = { id: 1, username: 'owner', displayName: 'Owner', farmId: 1, role: 'OWNER', farms: [{ id: 1, name: 'Test Farm' }], timeZone: 'Asia/Kolkata' }
const ready = { legacyDataWaiting: false, legacyClaimAvailable: false, publicRegistrationEnabled: false }
async function fixture(page, { setup, me, csrf, login, fish } = {}) {
  const calls = { setup: 0, me: 0, csrf: 0, login: 0, fish: 0 }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const reply = (json, status = 200) => route.fulfill({ json, status })
    if (path === '/api/auth/setup-status') { calls.setup++; return setup ? setup(route, calls, reply) : reply(ready) }
    if (path === '/api/auth/me') { calls.me++; return me ? me(route, calls, reply) : reply({ message: 'Please log in' }, 401) }
    if (path === '/api/auth/csrf') { calls.csrf++; return csrf ? csrf(route, calls, reply) : reply({ token: 'csrf-test' }) }
    if (path === '/api/auth/login') { calls.login++; return login ? login(route, calls, reply) : reply({ message: 'Invalid username or password' }, 401) }
    if (path === '/api/fish-types') { calls.fish++; return fish ? fish(route, calls, reply) : reply([]) }
    return reply([])
  })
  return calls
}

test('cold start waits through wake-up HTML and 502 before showing login', async ({ page }) => {
  const calls = await fixture(page, { setup: (route, calls, reply) => calls.setup === 1
    ? route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Service waking up</html>' })
    : calls.setup === 2 ? reply({ message: 'Starting' }, 502) : reply(ready) })
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { name: 'Connecting to your farm…' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toHaveCount(0)
  expect(calls.login).toBe(0)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible({ timeout: 15000 })
  expect(calls.setup).toBeGreaterThanOrEqual(3)
  await expect(page).toHaveURL('/admin/login')
})

test('a permanent readiness error offers retry without a retry loop', async ({ page }) => {
  let blocked = true
  const calls = await fixture(page, { setup: (_route, _calls, reply) => blocked ? reply({ message: 'Forbidden' }, 403) : reply(ready) })
  await page.goto('/login')
  await expect(page.getByRole('alert')).toContainText('(403)')
  expect(calls.setup).toBe(1)
  blocked = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
})

test('startup has a bounded wait and exposes manual retry', async ({ page }) => {
  await fixture(page, { setup: async (_route, _calls, reply) => {
    await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 241_000 })
    return reply({ message: 'Still unavailable' }, 503)
  } })
  await page.goto('/login')
  await expect(page.getByRole('alert')).toContainText('taking longer than expected')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
})

test('a failed csrf read recovers but login is sent only once', async ({ page }) => {
  const calls = await fixture(page, { csrf: (_route, calls, reply) => calls.csrf === 1 ? reply({}, 502) : reply({ token: 'csrf-test' }) })
  await page.goto('/login')
  await page.getByLabel('Mobile, email or username').fill('owner')
  await page.getByLabel('Password', { exact: true }).fill('A-password-for-testing')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid username or password')
  expect(calls.csrf).toBe(2)
  expect(calls.login).toBe(1)
})

test('a write returning 502 is never automatically replayed', async ({ page }) => {
  const calls = await fixture(page, { login: (_route, _calls, reply) => reply({}, 502) })
  await page.goto('/login')
  await page.getByLabel('Mobile, email or username').fill('owner')
  await page.getByLabel('Password', { exact: true }).fill('A-password-for-testing')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('not automatically repeated')
  expect(calls.login).toBe(1)
})

test('safe GET retries after readiness and recovers the current page', async ({ page }) => {
  const calls = await fixture(page, { me: (_route, _calls, reply) => reply(owner), fish: (_route, calls, reply) => calls.fish === 1 ? reply({}, 503) : reply([{ id: 1, name: 'Rohu', active: true }]) })
  await page.goto('/fish-types')
  await expect(page.getByRole('cell', { name: 'Rohu', exact: true })).toBeVisible()
  expect(calls.fish).toBe(2)
  expect(calls.setup).toBeGreaterThanOrEqual(2)
})

test('returning to the tab reconnects without losing a form draft', async ({ page }) => {
  const calls = await fixture(page)
  await page.goto('/request-trial')
  await page.getByLabel('Your name', { exact: true }).fill('Mushtaque Ahmad')
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 61_000; window.dispatchEvent(new Event('focus')) })
  await expect.poll(() => calls.setup).toBeGreaterThanOrEqual(2)
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Mushtaque Ahmad')
})

test('after a backend restart an expired session returns to login', async ({ page }) => {
  let expired = false
  const calls = await fixture(page, { me: (_route, _calls, reply) => expired ? reply({ message: 'Please log in' }, 401) : reply(owner) })
  await page.goto('/fish-types')
  await expect(page.locator('.page-title')).toContainText('Fish Types')
  expired = true
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 61_000; window.dispatchEvent(new Event('focus')) })
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  expect(calls.me).toBeGreaterThanOrEqual(2)
})

test('offline startup explains the connection problem and reconnects on online', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }))
  const calls = await fixture(page)
  await page.goto('/login')
  await expect(page.getByRole('alert')).toContainText('offline')
  expect(calls.setup).toBe(0)
  await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); window.dispatchEvent(new Event('online')) })
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
})

test('a disconnected write is not replayed and explains the uncertain result', async ({ page }) => {
  const calls = await fixture(page, { login: route => route.abort('connectionfailed') })
  await page.goto('/login')
  await page.getByLabel('Mobile, email or username').fill('owner')
  await page.getByLabel('Password', { exact: true }).fill('A-password-for-testing')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('connection was interrupted')
  expect(calls.login).toBe(1)
})

test('a mobile fetch that ignores abort cannot keep startup loading forever', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (url, options) => String(url).includes('/api/auth/setup-status')
      ? new Promise(() => {}) : originalFetch(url, options)
  })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Connecting to your farm…' })).toBeVisible()
  await page.clock.fastForward(241_000)
  await expect(page.getByRole('alert')).toContainText('REQUEST_TIMEOUT')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
})

test('a stalled response body is also bounded by the startup timeout', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (url, options) => String(url).includes('/api/auth/setup-status')
      ? Promise.resolve({ ok: true, status: 200, json: () => new Promise(() => {}) }) : originalFetch(url, options)
  })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Connecting to your farm…' })).toBeVisible()
  await page.clock.fastForward(241_000)
  await expect(page.getByRole('alert')).toContainText('REQUEST_TIMEOUT')
})

test('focus and tab visibility do not silently restart an exhausted attempt', async ({ page }) => {
  const calls = await fixture(page, { setup: (_route, _calls, reply) => reply({}, 403) })
  await page.goto('/login')
  await expect(page.getByRole('alert')).toContainText('(403)')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('alert')).toContainText('(403)')
  expect(calls.setup).toBe(1)
})

test('the initial request stays connected through a 150-second JVM cold start', async ({ page }) => {
  await page.clock.install()
  await fixture(page)
  await page.addInitScript(({ body }) => {
    window.startupAborts = 0
    const originalFetch = window.fetch.bind(window)
    window.fetch = (url, options) => {
      if (!String(url).includes('/api/auth/setup-status')) return originalFetch(url, options)
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })), 150_000)
        options?.signal?.addEventListener('abort', () => {
          window.startupAborts++
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      })
    }
  }, { body: ready })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Connecting to your farm…' })).toBeVisible()
  await page.clock.runFor(150_100)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.startupAborts)).toBe(0)
})
