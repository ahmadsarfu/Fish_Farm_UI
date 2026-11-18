import { test, expect } from '@playwright/test'

const owner = { id: 1, username: 'owner', displayName: 'Farm Owner', farmId: 1, role: 'OWNER', farms: [{ id: 1, name: 'Buyer Farm' }], timeZone: 'Asia/Kolkata' }
const admin = { ...owner, farmId: null, role: 'SUPER_ADMIN', farms: [] }
const token = 'test-invitation-token-that-is-at-least-forty-characters'
const customer = { id: 1, farmName: 'Buyer Farm', ownerName: 'Farm Buyer', mobile: '+919876543210', email: 'buyer@example.test', onboarding: 'INVITED', activeUsers: 0, subscription: { managed: true, planName: 'Starter', status: 'TRIAL', accessAllowed: true, pondLimit: 10, userLimit: 5, endsOn: null } }

async function fixtures(page, initialUser, purpose = 'ACTIVATION') {
  let user = initialUser
  let invited = false
  const writes = []
  await page.route('**/api/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4175', 'Access-Control-Allow-Credentials': 'true' }
    const reply = (json, status = 200) => route.fulfill({ headers, json, status })
    if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() })
    if (path === '/api/auth/csrf') return reply({ token: 'csrf-test' })
    if (path === '/api/auth/setup-status') return reply({ publicRegistrationEnabled: false, legacyClaimAvailable: true, legacyDataWaiting: true })
    if (path === '/api/auth/me') return reply(user || { message: 'Please log in' }, user ? 200 : 401)
    if (path === '/api/auth/login') { user = admin; return reply(user) }
    if (path === '/api/auth/invitation') return reply({ ownerName: customer.ownerName, farmName: customer.farmName, planName: 'Starter', trialDays: 30, purpose })
    if (path === '/api/auth/activate') { user = { ...owner, subscription: customer.subscription }; return reply(user) }
    if (path === '/api/platform/customers' && req.method() === 'POST') { invited = true; return reply({ customer, activationPath: `/activate#token=${token}`, expiresAt: '2026-12-01T00:00:00Z' }) }
    if (path === '/api/platform/customers') return reply({ items: invited ? [customer] : [], total: invited ? 1 : 0, pages: 1 })
    if (path.endsWith('/subscription')) return reply(customer)
    if (path === '/api/platform/activity') return reply({ content: [] })
    return reply([])
  })
  return writes
}

test('Super Admin adds a customer, gets an activation link and manages the plan', async ({ page }) => {
  const writes = await fixtures(page, admin)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/admin/customers')
  await page.getByRole('button', { name: '+ Add customer', exact: true }).click()
  await page.getByLabel('Owner name', { exact: true }).fill('Farm Buyer')
  await page.getByLabel('Farm name', { exact: true }).fill('Buyer Farm')
  await page.getByLabel('Mobile number').fill('9876543210')
  await page.getByLabel('Email (optional)').fill('buyer@example.test')
  await page.getByRole('button', { name: 'Create activation link', exact: true }).click()
  await expect(page.getByLabel('Private activation link')).toHaveValue(`http://127.0.0.1:4175/activate#token=${token}`)
  await expect(page.getByText('Awaiting activation', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('button', { name: 'Manage plan', exact: true }).click()
  await page.getByRole('combobox', { name: 'Plan access', exact: true }).selectOption('ACTIVE')
  await page.getByLabel('Access until', { exact: true }).fill('2027-12-31')
  await page.getByRole('button', { name: 'Save plan', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Plan saved')
  expect(writes.find(write => write.path.endsWith('/subscription')).body).toMatchObject({ status: 'ACTIVE', endsOn: '2027-12-31' })
  await page.getByRole('link', { name: 'Activity', exact: true }).click()
  await expect(page.locator('.page-title')).toHaveText('Platform activity')
  await page.getByRole('link', { name: 'My Account', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('customer activation sets a password and shows clear farm setup steps', async ({ page }) => {
  const writes = await fixtures(page, null)
  await page.goto(`/activate#token=${token}`)
  await expect(page.getByRole('heading', { name: 'Welcome, Farm Buyer' })).toBeVisible()
  await page.getByLabel('Choose a password').fill('Customer-password-123')
  await page.getByLabel('Confirm password').fill('Different-password-123')
  await page.getByRole('button', { name: 'Activate my farm', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Passwords do not match')
  await page.getByLabel('Confirm password').fill('Customer-password-123')
  await page.getByRole('button', { name: 'Activate my farm', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: "Welcome. Let's set up your farm." })).toBeVisible()
  await page.getByRole('link', { name: '1. Add ponds', exact: true }).click()
  await expect(page).toHaveURL('/ponds')
  expect(writes.find(write => write.path === '/api/auth/activate').body).toMatchObject({ token, password: 'Customer-password-123' })
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
})

test('platform access is separate from farm roles and admin login asks for MFA', async ({ page }) => {
  await fixtures(page, null)
  await page.goto('/admin/customers')
  await expect(page).toHaveURL('/admin/login')
  await page.getByLabel('Username').fill('platform-owner')
  await page.getByLabel('Password', { exact: true }).fill('Admin-password-123')
  await page.getByLabel('Authenticator code').fill('123456')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL('/admin/customers')
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/admin/customers')
  await page.unroute('**/api/**')
  await fixtures(page, owner)
  await page.goto('/admin/customers')
  await expect(page).toHaveURL('/dashboard')
})

test('paused customers see renewal guidance and public signup can be disabled', async ({ page }) => {
  await fixtures(page, { ...owner, subscription: { ...customer.subscription, status: 'SUSPENDED', accessAllowed: false } })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Your farm access needs renewal' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your farm data is preserved' })).toBeVisible()
  await page.getByRole('link', { name: 'My Account', exact: false }).click()
  await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeVisible()
  await page.unroute('**/api/**')
  await fixtures(page, null)
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Create a farm account' })).toHaveCount(0)
  await page.goto('/setup-existing')
  await expect(page.getByLabel('Use my existing farm data')).toBeChecked()
  await expect(page.getByLabel('One-time setup code')).toBeVisible()
})


test('a password reset link uses clear recovery wording and does not promise a new trial', async ({ page }) => {
  await fixtures(page, null, 'PASSWORD_RESET')
  await page.goto(`/activate#token=${token}`)
  await expect(page.getByText('Choose a new password. Other signed-in sessions will be logged out. Your farm plan and data stay the same.')).toBeVisible()
  await page.getByLabel('Choose a password').fill('Changed-password-123')
  await page.getByLabel('Confirm password').fill('Changed-password-123')
  await page.getByRole('button', { name: 'Save new password', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
})

test('farm registration collects mobile and email and preserves a duplicate-contact error', async ({ page }) => {
  let submitted
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4175', 'Access-Control-Allow-Credentials': 'true' }
  await fixtures(page, null)
  await page.route('**/api/auth/setup-status', route => route.fulfill({ headers, json: { publicRegistrationEnabled: true, legacyClaimAvailable: false, legacyDataWaiting: false } }))
  await page.route('**/api/auth/register', async route => {
    submitted = route.request().postDataJSON()
    await route.fulfill({ headers, status: 409, json: { message: 'This mobile or email is already in use.' } })
  })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Create a farm account', exact: true }).click()
  await expect(page.getByLabel('Mobile number')).toHaveAttribute('required', '')
  await page.getByLabel('Your name', { exact: true }).fill('Farm Owner')
  await page.getByLabel('Farm name', { exact: true }).fill('My New Farm')
  await page.getByLabel('Mobile number').fill('9876543210')
  await page.getByLabel('Email (optional)').fill('owner@example.test')
  await page.getByLabel('Username', { exact: true }).fill('farm-owner')
  await page.getByLabel('Password', { exact: true }).fill('Registration-password-123')
  await page.getByRole('button', { name: 'Create owner account', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('already in use')
  expect(submitted).toMatchObject({ mobile: '9876543210', email: 'owner@example.test', username: 'farm-owner' })
  await expect(page.getByLabel('Mobile number')).toHaveValue('9876543210')
})
