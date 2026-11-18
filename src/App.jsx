import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Loader from './components/Loader'
import AuthProvider from './auth/AuthProvider'
import { HomeRedirect, LoginRoute, PageAccess, ProtectedLayout } from './routing/RouteGuards'

const PlatformLayout = lazy(() => import('./layouts/platform/PlatformLayout'))
const PlatformCustomersPage = lazy(() => import('./pages/platform/PlatformCustomersPage'))
const PlatformActivityPage = lazy(() => import('./pages/platform/PlatformActivityPage'))
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'))

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const FishTypesPage = lazy(() => import('./pages/FishTypesPage'))
const PondsPage = lazy(() => import('./pages/PondsPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const DailyFeedPage = lazy(() => import('./pages/DailyFeedPage'))
const HarvestsPage = lazy(() => import('./pages/HarvestsPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const DispatchesPage = lazy(() => import('./pages/DispatchesPage'))
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage'))
const BatchesPage = lazy(() => import('./pages/BatchesPage'))
const TeamPage = lazy(() => import('./pages/TeamPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return <BrowserRouter><AuthProvider><Suspense fallback={<Loader />}><Routes>
    <Route path="activate" element={<ActivateAccountPage />} />
    <Route path="admin/login" element={<LoginRoute admin />} />
    <Route path="admin" element={<PlatformLayout />}>
      <Route index element={<Navigate to="customers" replace />} />
      <Route path="customers" element={<PlatformCustomersPage />} />
      <Route path="activity" element={<PlatformActivityPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="*" element={<Navigate to="/admin/customers" replace />} />
    </Route>
    <Route path="login" element={<LoginRoute />} />
    <Route path="setup-existing" element={<LoginRoute legacySetup />} />
    <Route element={<ProtectedLayout />}>
      <Route index element={<HomeRedirect />} />
      <Route path="dashboard" element={<PageAccess page="dashboard"><DashboardPage /></PageAccess>} />
      <Route path="fish-types" element={<PageAccess page="fish-types"><FishTypesPage /></PageAccess>} />
      <Route path="ponds" element={<PageAccess page="ponds"><PondsPage /></PageAccess>} />
      <Route path="customers" element={<PageAccess page="customers"><CustomersPage /></PageAccess>} />
      <Route path="daily-feed" element={<PageAccess page="daily-feed"><DailyFeedPage /></PageAccess>} />
      <Route path="harvests" element={<PageAccess page="harvests"><HarvestsPage /></PageAccess>} />
      <Route path="inventory" element={<PageAccess page="inventory"><InventoryPage /></PageAccess>} />
      <Route path="dispatches" element={<PageAccess page="dispatches"><DispatchesPage /></PageAccess>} />
      <Route path="sales-history" element={<PageAccess page="sales-history"><SalesHistoryPage /></PageAccess>} />
      <Route path="batches" element={<PageAccess page="batches"><BatchesPage /></PageAccess>} />
      <Route path="team" element={<PageAccess page="team"><TeamPage /></PageAccess>} />
      <Route path="account" element={<PageAccess page="account"><AccountPage /></PageAccess>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></Suspense></AuthProvider></BrowserRouter>
}
