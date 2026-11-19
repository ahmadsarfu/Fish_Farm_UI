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
