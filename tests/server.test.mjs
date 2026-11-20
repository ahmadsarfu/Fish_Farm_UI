import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { Agent, createServer, request as httpRequest } from 'node:http'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server.js'

let directory, upstream, frontend, origin
const requests = []
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)))
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) })
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fishfarm-proxy-'))
  await mkdir(join(directory, 'assets'))
  await writeFile(join(directory, 'index.html'), '<html><body>Farm SPA</body></html>')
  await writeFile(join(directory, 'assets/app-abc123.js'), 'console.log("fixture")')
  await writeFile(join(directory, 'sw.js'), '// fixture worker')
  upstream = createServer(async (req, res) => {
    let body = ''
    for await (const part of req) body += part
    requests.push({ url: req.url, method: req.method, headers: req.headers, body })
    if (req.headers['x-render-routing'] || req.headers['cdn-loop'] || req.headers['cf-ew-via']) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Fixture rejected stale edge routing metadata' }))
      return
    }
    if (req.url === '/api/auth/csrf') {
      res.setHeader('Set-Cookie', ['XSRF-TOKEN=fixture; Path=/; SameSite=Lax', 'JSESSIONID=session; Path=/; HttpOnly; SameSite=Lax'])
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ token: 'fixture', method: req.method, url: req.url }))
  })
  const backendUrl = await listen(upstream)
  frontend = createServer(createApp({ backendUrl, distDir: directory }))
  origin = await listen(frontend)
})
after(async () => { await close(frontend); await close(upstream); await rm(directory, { recursive: true, force: true }) })

test('serves SPA routes and keeps runtime files uncached', async () => {
  for (const path of ['/', '/dashboard', '/admin/login', '/activate']) {
    const response = await fetch(origin + path)
    assert.equal(response.status, 200)
    assert.match(await response.text(), /Farm SPA/)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal((await fetch(origin + '/sw.js')).headers.get('cache-control'), 'no-store')
  assert.match((await fetch(origin + '/assets/app-abc123.js')).headers.get('cache-control'), /immutable/)
  for (const path of ['/assets/missing.js', '/.local/platform.env', '/.git/config']) {
    assert.equal((await fetch(origin + path)).status, 404)
  }
})

test('forwards session/CSRF cookies, JSON body, origin, path and query', async () => {
  const csrf = await fetch(origin + '/api/auth/csrf')
  assert.equal(csrf.status, 200)
  assert.equal(csrf.headers.getSetCookie().length, 2)
  assert.equal(csrf.headers.get('cache-control'), 'no-store, private')
  assert.equal((await csrf.json()).token, 'fixture')
  const response = await fetch(origin + '/api/feeding-dashboard/1/slots/MORNING?date=2026-11-19', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': 'fixture', Cookie: 'JSESSIONID=session; XSRF-TOKEN=fixture', Origin: origin },
    body: JSON.stringify({ completed: true }),
  })
  assert.equal(response.status, 200)
  const last = requests.at(-1)
  assert.equal(last.url, '/api/feeding-dashboard/1/slots/MORNING?date=2026-11-19')
  assert.equal(last.method, 'PUT')
  assert.equal(last.headers['x-xsrf-token'], 'fixture')
  assert.equal(last.headers.cookie, 'JSESSIONID=session; XSRF-TOKEN=fixture')
  assert.equal(last.headers.origin, origin)
  assert.deepEqual(JSON.parse(last.body), { completed: true })
})

test('rejects invalid upstream configuration and missing build', () => {
  for (const backendUrl of ['', 'file:///etc/passwd', 'https://example.test/api', 'https://user:secret@example.test']) {
    assert.throws(() => createApp({ backendUrl, distDir: directory }))
  }
  assert.throws(() => createApp({ backendUrl: 'https://example.test', distDir: join(directory, 'missing') }))
})

test('returns a useful uncached 502 when the backend is unavailable', async () => {
  const target = createServer()
  const url = await listen(target)
  await close(target)
  const server = createServer(createApp({ backendUrl: url, distDir: directory }))
  const address = await listen(server)
  try {
    const response = await fetch(address + '/api/auth/csrf')
    assert.equal(response.status, 502)
    assert.equal(response.headers.get('cache-control'), 'no-store, private')
    assert.match((await response.json()).message, /backend is starting or unavailable/)
    assert.equal((await fetch(address + '/healthz')).status, 200)
  } finally { await close(server) }
})


test('repeated API checks do not accumulate timeout listeners on a keep-alive socket', async () => {
  const server = createServer(createApp({ backendUrl: `http://127.0.0.1:${upstream.address().port}`, distDir: directory }))
  const sockets = new Set()
  server.on('connection', socket => sockets.add(socket))
  const address = await listen(server)
  const agent = new Agent({ keepAlive: true, maxSockets: 1 })
  const get = () => new Promise((resolve, reject) => {
    const req = httpRequest(address + '/api/auth/setup-status', { agent, headers: { Connection: 'keep-alive' } }, res => {
      res.resume()
      res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject); req.end()
  })
  try {
    assert.equal(await get(), 200)
    const socket = [...sockets][0]
    const baseline = socket.listenerCount('timeout')
    for (let i = 0; i < 25; i++) assert.equal(await get(), 200)
    assert.equal(sockets.size, 1, 'test must reuse the same client socket')
    assert.equal(socket.listenerCount('timeout'), baseline)
  } finally { agent.destroy(); await close(server) }
})


test('a request crossing two hosting edges drops the previous hop routing headers', async () => {
  const headers = {
    'CDN-Loop': 'cloudflare; loops=1',
    'CF-EW-Via': '15',
    'CF-Ray': 'fixture-ray',
    'CF-Worker': 'fixture-worker',
    'X-Render-Routing': 'frontend-fixture-route',
    'X-Render-Original-Host': 'frontend.example.test',
    Origin: origin,
    Cookie: 'JSESSIONID=session; XSRF-TOKEN=fixture',
    'X-XSRF-TOKEN': 'fixture',
  }
  const response = await fetch(origin + '/api/auth/csrf', { headers })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).token, 'fixture')
  const forwarded = requests.at(-1).headers
  for (const name of ['cdn-loop', 'cf-ew-via', 'cf-ray', 'cf-worker', 'x-render-routing', 'x-render-original-host']) assert.equal(forwarded[name], undefined, name)
  assert.equal(forwarded.origin, origin)
  assert.equal(forwarded.cookie, headers.Cookie)
  assert.equal(forwarded['x-xsrf-token'], 'fixture')
  assert.equal(forwarded.host, `127.0.0.1:${upstream.address().port}`)
})
