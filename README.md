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

`npm run lint` reports existing issues in App.jsx, invoice generation and main.jsx.
New auth, account, team, batch and feeding components pass targeted ESLint. Backend
security, tenancy and costing integration tests live in the backend repository.
