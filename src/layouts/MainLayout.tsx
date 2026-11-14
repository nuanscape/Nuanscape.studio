import * as React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SidebarNav, type NavGroupData } from '@/components/ui/dashboard-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { CommandPalette } from '@/components/layout/command-palette'
import { useAppStore } from '@/stores/app-store'
import { getWorkspaceForPath, workspaces } from '@/components/navigation/nav-config'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { sidebarCollapsed, setCommandOpen } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const workspace = getWorkspaceForPath(location.pathname)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandOpen])

  const groups = React.useMemo<NavGroupData[]>(
    () => [
      {
        items: workspace.items.map((item) => ({
          id: item.href,
          title: item.label,
          icon: item.icon,
          href: item.href,
        })),
      },
    ],
    [workspace],
  )

  const activeId =
    workspace.items.find(
      (item) => location.pathname === item.href || (item.href !== '/app/monitor' && location.pathname.startsWith(item.href)),
    )?.href ?? workspace.href

  const onSelect = (id: string) => {
    const item = groups[0].items.find((i) => i.id === id)
    const href = item?.href
    if (href) navigate(href)
    else if (id.startsWith('/')) navigate(id)
  }

  return (
    <div className="app-backdrop min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-[12px] focus:font-semibold focus:text-ink"
      >
        Lewati ke konten
      </a>
      <div className={cn('fixed inset-y-0 left-0 z-40 hidden transition-all lg:block', sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[260px]')}>
        <SidebarNav
          groups={groups}
          bottomItems={[]}
          activeId={activeId}
          onSelect={onSelect}
          activeWorkspace={workspace.id}
          onWorkspaceSelect={(id) => {
            const w = workspaces.find((x) => x.id === id)
            if (w) navigate(w.href)
          }}
          workspaceOptions={workspaces.map((w) => ({ id: w.id, name: w.label, subtitle: w.short }))}
          className="h-full border-r border-white/[0.06] bg-[#0a0a0a]"
        />
      </div>
      <div className={cn('landing-surface flex min-h-dvh flex-col bg-background text-text-primary transition-[padding] duration-300', sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-[260px]')}>
        <Topbar />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  )
}
