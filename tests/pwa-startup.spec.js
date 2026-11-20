import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { createApp } from '../server.js'

// Real service worker + real proxy, so counts measure actual backend requests,
// not Chrome's separate frame/SW entries for the same logical fetch.
test.use({ serviceWorkers: 'allow' })
test('installed PWA makes one setup/session request and serves valid install icons', async ({ page }) => {
  const calls = new Map()
  const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)))
  const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) })
  const upstream = createServer(async (req, res) => {
    for await (const part of req) { void part }
    calls.set(req.url, (calls.get(req.url) || 0) + 1)
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/api/auth/setup-status') return res.end(JSON.stringify({ legacyDataWaiting: false, legacyClaimAvailable: false, publicRegistrationEnabled: false }))
    if (req.url === '/api/auth/csrf') return res.end(JSON.stringify({ token: 'pwa-test' }))
    res.statusCode = 401
    res.end(JSON.stringify({ message: req.url === '/api/auth/login' ? 'Invalid username or password' : 'Please log in' }))
  })
  const backendUrl = await listen(upstream)
  const frontend = createServer(createApp({ backendUrl }))
  const origin = await listen(frontend)
  try {
    await page.goto(origin + '/login')
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    })
    calls.clear()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
    expect(calls.get('/api/auth/setup-status')).toBe(1)
    expect(calls.get('/api/auth/me')).toBe(1)
    for (const size of [192, 512]) {
      const dimensions = await page.evaluate(async size => {
        const response = await fetch(`/icon-${size}.png`)
        if (!response.ok) throw new Error(`Icon returned ${response.status}`)
        const image = await createImageBitmap(await response.blob())
        return { width: image.width, height: image.height }
      }, size)
      expect(dimensions).toEqual({ width: size, height: size })
    }
    await page.getByLabel('Mobile, email or username').fill('owner')
    await page.getByLabel('Password', { exact: true }).fill('Test-password-only')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Invalid username or password')
    expect(calls.get('/api/auth/login')).toBe(1)
  } finally { await close(frontend); await close(upstream) }
})
