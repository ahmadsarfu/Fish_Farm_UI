import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { existsSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = dirname(fileURLToPath(import.meta.url))

// Keep browser requests on the UI origin. Cookies and CSRF headers are forwarded
// to Spring Boot without exposing a second browser origin or disabling CSRF.
export function createApp({ backendUrl = process.env.API_PROXY_TARGET, distDir = join(root, 'dist') } = {}) {
  if (!backendUrl) throw new Error('Set API_PROXY_TARGET to the Spring Boot backend origin.')
  const target = new URL(backendUrl)
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('API_PROXY_TARGET must be an HTTP(S) origin without credentials or an /api suffix.')
  }
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('Frontend build is missing. Run npm run build first.')
  const app = express()
  app.disable('x-powered-by')
  app.get('/healthz', (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }))
  app.use('/api', createProxyMiddleware({
    target: target.origin,
    changeOrigin: true,
    xfwd: true,
    // Express removes the mount path; Spring Boot still needs the full /api path.
    pathRewrite: (_path, req) => req.originalUrl,
    cookieDomainRewrite: '',
    timeout: 120000,
    proxyTimeout: 120000,
    on: {
      proxyRes: upstream => { upstream.headers['cache-control'] = 'no-store, private' },
      error: (_error, _req, res) => {
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' })
        res.end(JSON.stringify({ message: 'The backend is starting or unavailable. Please wait a moment and try again.' }))
      },
    },
  }))
  app.use(express.static(distDir, {
    index: false,
    setHeaders: (res, file) => res.setHeader('Cache-Control', file.startsWith(join(distDir, 'assets') + '/') ? 'public, max-age=31536000, immutable' : 'no-store'),
  }))
  app.get('/{*page}', (req, res) => {
    if (extname(req.path) || req.path.startsWith('/assets/') || req.path.split('/').some(part => part.startsWith('.'))) {
      return res.status(404).set('Cache-Control', 'no-store').send('Not found')
    }
    res.set('Cache-Control', 'no-store').sendFile(join(distDir, 'index.html'))
  })
  return app
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4174)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.')
  createApp().listen(port, '0.0.0.0', () => console.info(`Fish Farm UI listening on port ${port}`))
}
