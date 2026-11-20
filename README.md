# Fish Farm UI

React / Vite frontend for farm operations, one-tap labour feeding, team access and
nursery-to-grow-out batch costing.

For an existing installation, upgrade and start the backend first using its
[Farm and Batch Setup guide](https://github.com/ahmadsarfu/Fish_Farm/blob/master/docs/FARM_BATCH_SETUP.md).
Existing data is preserved behind owner setup; creating a separate new farm does
not import another farm's data.

```bash
npm ci
npm run build
npm run preview
```

Development: `npm run dev`. Default API: `http://localhost:8080`. Default preview:
port 4174. Keep the UI/API hostname the same for cookie sessions and configure the
backend's allowed origins explicitly. `VITE_API_BASE_URL` selects the API at build
time; set it to an empty string for a same-origin `/api` production reverse proxy.
The backend supplies the business timezone (default Asia/Kolkata).

- Owner manages team users and farm selection.
- Manager handles farm operations and batch costing.
- Labour sees assigned ponds and today's AM/PM feeding only.
- All users can log out and change their own password.

Use the shared API client for credentials and CSRF. Do not store login credentials
or private farm responses in browser storage. The service worker uses NetworkOnly
for API routes and removes the previous runtime API cache.

The frontend is organized by responsibility:

```text
src/
  api/                  # shared client, auth, feed, batch and module APIs
  auth/                 # session context, provider and login/register form
  components/           # shared Alert, Modal, Confirm, Empty and Loader
    dispatch/           # dispatch weighing/detail workflow
    feed/               # daily checklist, pond setup and feeding records
    invoice/            # PDF generation
  hooks/                # reusable data loading with stale-response protection
  layouts/              # farm shell, sidebar and header
  pages/                # one module per routed page
  routing/              # navigation metadata and authentication/role guards
  utils/                # shared date helpers
  App.jsx               # route declarations and lazy page imports
```

Navigation uses React Router and real links. Routes can be bookmarked, opened in
new tabs and refreshed; browser Back/Forward follows page navigation. `/` opens
`/dashboard` for Owner/Manager and `/daily-feed` for Labour. Other routes are
`/fish-types`, `/ponds`, `/customers`, `/harvests`, `/inventory` (Fish Stock),
`/dispatches`, `/sales-history`, `/batches`, `/team` and `/account`. `/login`
returns an authenticated user to the requested permitted page. Registration is
available within the login form. Unknown paths display a recovery page.

Sidebar visibility and direct-route access share the same role policy. Backend
authorization remains mandatory. Changing farms remounts the page and clears
previous drafts; a new farm's role is checked again. Customer dispatch shortcuts
use `/dispatches?customerId=...`, preserving preselection through refresh.

If a pull changes `package-lock.json`, stop preview, run `npm ci`, rebuild, and
restart preview. A successful build alone cannot detect every browser runtime
problem. React and React DOM are pinned to the same version, and Vite deduplicates
both so nested dependency installations cannot introduce a second hooks runtime.

Pages load in separate JavaScript chunks. Add future page modules under `pages`,
their API calls under `api`, an explicit route in `App.jsx`, and the navigation and
role policy in `routing/navigation.js`. All requests go through `api/client.js`
so session cookies and CSRF handling stay consistent.

### Production routing

Vite dev/preview already serves `index.html` for page routes. A production static
host must also rewrite page URLs to `index.html`; otherwise a direct visit to
`/ponds` will return a server 404. Keep API requests routed to the backend before
the SPA fallback. For example, inside an Nginx server block:

```nginx
root /var/www/fishfarm-ui/dist;

location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Build with `VITE_API_BASE_URL=` for this same-origin deployment. Private API
responses must not be cached by the reverse proxy or service worker.

### Verification

```bash
npm run lint
npm run build
npx playwright install chromium  # once, for browser tests
npm run test:e2e
```

The browser suite starts a production preview automatically and uses mocked API
responses, so it never writes to a real farm database. It covers direct URLs,
refresh, history, login redirects, logout/session expiry, role restrictions,
customer-to-dispatch navigation, switching farms and mobile navigation. To use an
installed Chromium instead of Playwright's download:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Backend security, tenancy and costing integration tests live in the backend repo.

### Customer sales and Super Admin

`/admin/login` is the separate platform login (password + authenticator code).
`/admin/customers` manages customer invitations and per-farm trials, expiry and
limits. `/admin/activity` shows platform changes. Customers use `/activate#token=...`
to set their own password, then `/login` with mobile/email or a legacy username.
Password reset uses the same activation screen with a short-lived reset link.
Contact the provider for a reset; automatic email/SMS delivery is not configured.

The forms and link view live in `components/platform`, platform pages in
`pages/platform`, the separate layout in `layouts/platform`, and API calls in
`api/platformApi.js`. Frontend role guards supplement backend authorization.

Upgrade the backend database and configure the first platform owner before using
these routes: [Platform setup guide](https://github.com/ahmadsarfu/Fish_Farm/blob/master/docs/PLATFORM_SETUP.md).


### Render trial with browser sessions

Deploy this repository as a Node Web Service. Build with
`npm ci --include=dev && VITE_API_BASE_URL= npm run build`, start with `npm start`,
and set `API_PROXY_TARGET` to the backend HTTPS origin (without `/api`). The
production server serves `dist` and forwards `/api` requests, session cookies and
CSRF headers to Spring Boot. Browser requests stay on the UI origin, so separate
Render service domains do not require third-party cookies. API responses are
never cached. `/healthz` checks the UI server; `/api/auth/setup-status` checks the
backend through the proxy.

Use `npm run test:server` for production-serving/proxy tests. Playwright's existing
suite uses `*.spec.js`; the Node test runner uses `tests/server.test.mjs`.

Full cloud database + backend + frontend instructions:
[Render Free Trial](https://github.com/ahmadsarfu/Fish_Farm/blob/master/docs/RENDER_FREE_TRIAL.md).

### Trial request onboarding

The login page links to `/request-trial`, available while public signup is disabled.
Super Admins review pending requests at `/admin/trial-requests`, choose trial limits,
and copy the existing activation link to share manually. No automatic email/SMS is
sent. Apply the backend `docs/sql/trial-requests-upgrade.sql` migration before
releasing this flow; see backend `docs/TRIAL_REQUESTS.md` for deployment and support.

### Backend cold starts

The browser checks `/api/auth/setup-status` before mounting the app. It accepts
only the JSON API readiness response, not Render's HTTP-200 HTML wake-up page.
Temporary startup/network failures use a shared probe: 210-second readiness request timeout (to allow the measured 150-second JVM startup),
3-second delay, and a 4-minute total wait. Offline and persistent configuration
errors show a retry button. There is no background keep-alive polling; the service
can still sleep under the hosting plan's rules.

Returning to the visible tab or making an API request checks readiness again when
the previous successful check is over 60 seconds old. Existing forms stay mounted
while reconnecting, preserving drafts. The session is revalidated after reconnect;
expired sessions return to login. Read requests may retry once after recovery.
Login, feeding ticks, saves and other writes are never automatically replayed. If
a write loses its response, check the saved records before repeating it.

This handles backend startup after the frontend has loaded. It cannot remove the
hosting provider's initial frontend wake-up page, fix invalid database credentials,
or provide an always-on uptime guarantee. No backend environment or SQL migration
is required for this change.

The Node proxy uses a 225-second upstream timeout and avoids the proxy library's
inbound socket-timeout option, which accumulates listeners on reused sockets.
Timeout handling also bounds stalled response bodies, and returning browser focus
cannot silently restart an exhausted attempt. An exhausted readiness screen shows
a safe reference such as `HTTP_502`, `REQUEST_TIMEOUT` or `NETWORK_ERROR`.
Upstream HTTP 5xx statuses and connection error codes are logged without request
bodies, cookies, tokens or credentials. These codes help diagnose a persistent 502;
retrying cannot fix a wrong target or a stopped backend that does not start.

The frontend-to-backend proxy removes previous-hop CDN/Render routing metadata
(`CDN-Loop`, `CF-EW-Via`, `CF-Ray`, `CF-Worker`, `CF-Connecting-IP`,
`CF-Connecting-IPv6`, `True-Client-IP`, and `X-Render-*`) before issuing a
new outbound request through the backend's hosting edge. Browser `Origin`, session
cookies and CSRF headers are preserved. Startup logs show the validated public
upstream origin so an incorrect `API_PROXY_TARGET` can be diagnosed without sharing
secret environment variables. A hosting-edge 502 still requires comparing the
direct backend response and current backend events; local tests do not verify
Render's live service state.

Cloudflare's [Error 1000 documentation](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1000/)
lists `CF-Connecting-IP` on a new request and oversized/duplicated
`X-Forwarded-For` as rejection causes. The proxy therefore sends a single validated
client IP in `X-Forwarded-For`, preferring the front hosting edge's client IP, and
does not forward its reserved Cloudflare client-IP header to a second Cloudflare
edge. Normal browser `Origin`, CSRF, cookies, forwarded public host and HTTPS
metadata remain available to Spring Security. Do not change provider-owned
`onrender.com` DNS records in response to the generic Cloudflare error page.

### Startup requests in browser DevTools

The public setup payload is reused from the fresh readiness check by the login
form, avoiding a second startup `setup-status` request. Readiness still expires
after 60 seconds and transient failures can require another safe probe.

Chrome may display both the page fetch and the service worker's network fetch
for a single logical API call. Use upstream counts rather than adding those rows.
`GET /api/auth/me` returning 401 before login is an expected session check; protected
endpoints retain their authentication requirements. The PWA install icons are
provided at `/icon-192.png` and `/icon-512.png`.
