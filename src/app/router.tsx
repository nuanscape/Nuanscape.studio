import * as React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { MainLayout } from '@/layouts/MainLayout'
import { ContentFormatLayout } from '@/features/content/components/content-flow'
import { getCurrentNavItem } from '@/components/navigation/nav-config'
import { useAuthStore } from '@/stores/app-store'

const lazyPage = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, name: keyof T) =>
  React.lazy(() => loader().then((mod) => ({ default: mod[name] })))

const AgentMonitorPage = lazyPage(() => import('@/features/monitor/AgentMonitorPage'), 'AgentMonitorPage')
const LandingPage = lazyPage(() => import('@/features/landing/LandingPage'), 'LandingPage')
const AdminLoginPage = lazyPage(() => import('@/features/auth/AdminLoginPage'), 'AdminLoginPage')
const AutomationsPage = lazyPage(() => import('@/features/automations/AutomationsPage'), 'AutomationsPage')
const NotificationsPage = lazyPage(() => import('@/features/notifications/NotificationsPage'), 'NotificationsPage')
const SettingsPage = lazyPage(() => import('@/features/settings/SettingsPage'), 'SettingsPage')
const ProfilePage = lazyPage(() => import('@/features/profile/ProfilePage'), 'ProfilePage')
const FinanceOverviewPage = lazyPage(() => import('@/features/finance/FinanceOverviewPage'), 'FinanceOverviewPage')
const FinanceTransactionsPage = lazyPage(() => import('@/features/finance/FinanceTransactionsPage'), 'FinanceTransactionsPage')
const FinanceIncomePage = lazyPage(() => import('@/features/finance/FinanceIncomePage'), 'FinanceIncomePage')
const FinanceExpensesPage = lazyPage(() => import('@/features/finance/FinanceExpensesPage'), 'FinanceExpensesPage')
const FinanceBudgetsPage = lazyPage(() => import('@/features/finance/FinanceBudgetsPage'), 'FinanceBudgetsPage')
const FinanceAssetsPage = lazyPage(() => import('@/features/finance/FinanceAssetsPage'), 'FinanceAssetsPage')
const FinanceGoalsPage = lazyPage(() => import('@/features/finance/FinanceGoalsPage'), 'FinanceGoalsPage')
const FinanceReportsPage = lazyPage(() => import('@/features/finance/FinanceReportsPage'), 'FinanceReportsPage')
const ContentOverviewPage = lazyPage(() => import('@/features/content/ContentOverviewPage'), 'ContentOverviewPage')
const ContentFormatHubPage = lazyPage(() => import('@/features/content/ContentFormatHubPage'), 'ContentFormatHubPage')
const ContentAccountsPage = lazyPage(() => import('@/features/content/ContentAccountsPage'), 'ContentAccountsPage')
const ContentAccountPage = lazyPage(() => import('@/features/content/ContentAccountPage'), 'ContentAccountPage')
const ContentResearchPage = lazyPage(() => import('@/features/content/ContentResearchPage'), 'ContentResearchPage')
const ContentIdeasPage = lazyPage(() => import('@/features/content/ContentIdeasPage'), 'ContentIdeasPage')
const ContentScriptsPage = lazyPage(() => import('@/features/content/ContentScriptsPage'), 'ContentScriptsPage')
const ContentStudioPage = lazyPage(() => import('@/features/content/ContentStudioPage'), 'ContentStudioPage')
const ContentCalendarPage = lazyPage(() => import('@/features/content/ContentCalendarPage'), 'ContentCalendarPage')
const ContentLibraryPage = lazyPage(() => import('@/features/content/ContentLibraryPage'), 'ContentLibraryPage')
const ContentDraftsPage = lazyPage(() => import('@/features/content/ContentDraftsPage'), 'ContentDraftsPage')
const ContentAnalyticsPage = lazyPage(() => import('@/features/content/ContentAnalyticsPage'), 'ContentAnalyticsPage')
const SellerOverviewPage = lazyPage(() => import('@/features/seller/SellerOverviewPage'), 'SellerOverviewPage')
const SellerMarketplacesPage = lazyPage(() => import('@/features/seller/SellerMarketplacesPage'), 'SellerMarketplacesPage')
const SellerProductsPage = lazyPage(() => import('@/features/seller/SellerProductsPage'), 'SellerProductsPage')
const SellerInventoryPage = lazyPage(() => import('@/features/seller/SellerInventoryPage'), 'SellerInventoryPage')
const SellerOrdersPage = lazyPage(() => import('@/features/seller/SellerOrdersPage'), 'SellerOrdersPage')
const SellerFinancePage = lazyPage(() => import('@/features/seller/SellerFinancePage'), 'SellerFinancePage')
const SellerSeoPage = lazyPage(() => import('@/features/seller/SellerSeoPage'), 'SellerSeoPage')
const SellerIntelligencePage = lazyPage(() => import('@/features/seller/SellerIntelligencePage'), 'SellerIntelligencePage')
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    const base = 'Nuanscape.studio'
    if (pathname === '/') {
      document.title = `${base} — Agentic Command Center`
      return
    }
    if (pathname === '/login') {
      document.title = `Masuk · ${base}`
      return
    }
    const current = getCurrentNavItem(pathname)
    document.title = current ? `${current.label} · ${base}` : base
  }, [pathname])
  return null
}

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-[70dvh] place-items-center px-6 text-center" role="alert">
        <div className="max-w-sm">
          <p className="text-[15px] font-semibold text-text-primary">Halaman gagal dimuat</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">
            Koneksi terputus saat memuat modul. Muat ulang untuk melanjutkan.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-primary-soft"
          >
            Muat ulang
          </button>
        </div>
      </div>
    )
  }
}

function RouteFallback() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="size-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Memuat...</span>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const session = useAuthStore((s) => s.session)
  const adminAuthed = useAuthStore((s) => s.adminAuthed)
  const location = useLocation()
  if (!session && !adminAuthed) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteErrorBoundary>
        <React.Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AdminLoginPage />} />

          <Route path="/app" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/app/monitor" replace />} />
              <Route path="monitor" element={<AgentMonitorPage />} />
              <Route path="overview" element={<Navigate to="/app/monitor" replace />} />
              <Route path="assistant" element={<Navigate to="/app/monitor" replace />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />

              <Route path="finance/overview" element={<FinanceOverviewPage />} />
              <Route path="finance/transactions" element={<FinanceTransactionsPage />} />
              <Route path="finance/income" element={<FinanceIncomePage />} />
              <Route path="finance/expenses" element={<FinanceExpensesPage />} />
              <Route path="finance/budgets" element={<FinanceBudgetsPage />} />
              <Route path="finance/assets" element={<FinanceAssetsPage />} />
              <Route path="finance/goals" element={<FinanceGoalsPage />} />
              <Route path="finance/reports" element={<FinanceReportsPage />} />

              <Route path="content/overview" element={<ContentOverviewPage />} />
              <Route path="content/accounts" element={<ContentAccountsPage />} />
              <Route path="content/accounts/:accountId" element={<ContentAccountPage />} />
              <Route path="content/long-form" element={<ContentFormatLayout />}>
                <Route index element={<ContentFormatHubPage />} />
                <Route path="research" element={<ContentResearchPage />} />
                <Route path="ideas" element={<ContentIdeasPage />} />
                <Route path="scripts" element={<ContentScriptsPage />} />
                <Route path="studio" element={<ContentStudioPage />} />
                <Route path="drafts" element={<ContentDraftsPage />} />
                <Route path="calendar" element={<ContentCalendarPage />} />
                <Route path="library" element={<ContentLibraryPage />} />
                <Route path="analytics" element={<ContentAnalyticsPage />} />
              </Route>
              <Route path="content/short-form" element={<ContentFormatLayout />}>
                <Route index element={<ContentFormatHubPage />} />
                <Route path="research" element={<ContentResearchPage />} />
                <Route path="ideas" element={<ContentIdeasPage />} />
                <Route path="scripts" element={<ContentScriptsPage />} />
                <Route path="studio" element={<ContentStudioPage />} />
                <Route path="drafts" element={<ContentDraftsPage />} />
                <Route path="calendar" element={<ContentCalendarPage />} />
                <Route path="library" element={<ContentLibraryPage />} />
                <Route path="analytics" element={<ContentAnalyticsPage />} />
              </Route>
              <Route path="content" element={<Navigate to="/app/content/overview" replace />} />
              <Route path="content/research" element={<Navigate to="/app/content/long-form/research" replace />} />
              <Route path="content/ideas" element={<Navigate to="/app/content/long-form/ideas" replace />} />
              <Route path="content/scripts" element={<Navigate to="/app/content/long-form/scripts" replace />} />
              <Route path="content/studio" element={<Navigate to="/app/content/long-form/studio" replace />} />
              <Route path="content/drafts" element={<Navigate to="/app/content/long-form/drafts" replace />} />
              <Route path="content/calendar" element={<Navigate to="/app/content/long-form/calendar" replace />} />
              <Route path="content/library" element={<Navigate to="/app/content/long-form/library" replace />} />
              <Route path="content/analytics" element={<Navigate to="/app/content/long-form/analytics" replace />} />

              <Route path="seller/overview" element={<SellerOverviewPage />} />
              <Route path="seller/marketplaces" element={<SellerMarketplacesPage />} />
              <Route path="seller/products" element={<SellerProductsPage />} />
              <Route path="seller/inventory" element={<SellerInventoryPage />} />
              <Route path="seller/orders" element={<SellerOrdersPage />} />
              <Route path="seller/finance" element={<SellerFinancePage />} />
              <Route path="seller/seo" element={<SellerSeoPage />} />
              <Route path="seller/intelligence" element={<SellerIntelligencePage />} />
              <Route path="shop/*" element={<Navigate to="/app/seller/overview" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </React.Suspense>
      </RouteErrorBoundary>
    </BrowserRouter>
  )
}
