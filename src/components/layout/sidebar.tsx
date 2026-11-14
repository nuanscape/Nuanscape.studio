import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { useAppStore, useAuthStore } from '@/stores/app-store'
import {
  extraNavigation,
  getCurrentNavItem,
  getWorkspaceForPath,
  workspaces,
} from '@/components/navigation/nav-config'
import {
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/ui/dropdown'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const workspace = getWorkspaceForPath(location.pathname)
  const currentItem = getCurrentNavItem(location.pathname)
  const extraItems = extraNavigation.filter(
    (item) =>
      item.href !== '/app/profile' && !workspace.items.some((navItem) => navItem.href === item.href),
  )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-sidebar/95 backdrop-blur-xl transition-[width] duration-300 lg:flex',
        sidebarCollapsed ? 'w-[78px]' : 'w-[268px]',
      )}
    >
      <div className={cn('flex h-16 items-center gap-2.5 border-b border-line', sidebarCollapsed ? 'justify-center px-3' : 'px-5')}>
        <Link to="/app/overview" className="flex items-center gap-2.5">
          {sidebarCollapsed ? (
            <img src="/nuanscape-mark.svg" alt="NuanScape" className="size-8 shrink-0" />
          ) : (
            <span className="flex flex-col leading-none">
              <img src="/logo-n-opt.png" alt="NuanScape" width={360} height={133} className="h-5 w-auto object-contain" />
              <span className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-text-muted">
                AI Command Center
              </span>
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        {!sidebarCollapsed ? (
          <DropdownMenu
            align="left"
            width="w-[236px]"
            trigger={
              <button className="group flex w-full items-center gap-2.5 rounded-xl border border-line bg-card/60 p-2.5 text-left transition-colors hover:border-line-strong hover:bg-card">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg border"
                  style={{
                    borderColor: `${workspace.accent}35`,
                    backgroundColor: `${workspace.accent}12`,
                    color: workspace.accent,
                  }}
                >
                  <workspace.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-text-primary">
                    {workspace.label}
                  </span>
                  <span className="block truncate text-[10px] text-text-muted">{workspace.description}</span>
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-text-muted transition-colors group-hover:text-text-secondary" />
              </button>
            }
          >
            <DropdownLabel>Switch workspace</DropdownLabel>
            {workspaces.map((w) => (
              <DropdownItem key={w.id} icon={<w.icon />} onClick={() => navigate(w.href)}>
                <span className="flex w-full items-center justify-between gap-2">
                  {w.label}
                  {w.id === workspace.id ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                </span>
              </DropdownItem>
            ))}
          </DropdownMenu>
        ) : (
          <DropdownMenu
            align="left"
            width="w-[236px]"
            trigger={
              <button
                className="grid size-10 w-full place-items-center rounded-xl border border-line bg-card/60 transition-colors hover:border-line-strong"
                style={{ color: workspace.accent }}
                aria-label="Switch workspace"
              >
                <workspace.icon className="size-4" />
              </button>
            }
          >
            <DropdownLabel>Switch workspace</DropdownLabel>
            {workspaces.map((w) => (
              <DropdownItem key={w.id} icon={<w.icon />} onClick={() => navigate(w.href)}>
                {w.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        )}

        <div className={cn('mt-6 flex-1', sidebarCollapsed && 'mt-5')}>
          {!sidebarCollapsed ? (
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted/80">
              {workspace.short} workspace
            </p>
          ) : null}
          <nav className="space-y-0.5">
            {workspace.items.map((item) => {
              const active = currentItem?.href === item.href
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex items-center rounded-lg py-2 text-[13px] font-medium transition-all',
                    sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                    active
                      ? 'bg-primary/[0.08] text-text-primary'
                      : 'text-text-secondary hover:bg-white/[0.035] hover:text-text-primary',
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_2px_rgba(245,214,75,0.4)]" />
                  ) : null}
                  <item.icon
                    className={cn(
                      'size-4 shrink-0 transition-colors [stroke-width:1.7]',
                      active ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary',
                    )}
                  />
                  {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                  {!sidebarCollapsed && item.badge ? (
                    <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {!sidebarCollapsed ? (
          <div className="mt-4 rounded-xl border border-line bg-gradient-to-br from-primary/[0.06] to-transparent p-3">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-primary" />
              <span className="text-[11px] font-medium text-text-primary">AI workspace usage</span>
              <span className="ml-auto num text-[10px] text-text-muted">78%</span>
            </div>
            <Progress value={78} size="sm" className="mt-2.5" />
            <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
              14.2k dari 18k kredit bulan ini. Reset 1 Des.
            </p>
          </div>
        ) : null}

        <div className={cn('mt-4 border-t border-line pt-3', sidebarCollapsed && 'mt-3')}>
          {!sidebarCollapsed && extraItems.length > 0 ? (
            <nav className="mb-2 space-y-0.5">
              {extraItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.035] hover:text-text-primary"
                >
                  <item.icon className="size-3.5 [stroke-width:1.7]" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <Link
            to="/app/profile"
            aria-label={sidebarCollapsed ? 'Buka profil' : undefined}
            className={cn(
              'flex items-center rounded-xl border border-transparent p-1.5 transition-colors hover:border-line hover:bg-white/[0.03]',
              sidebarCollapsed ? 'justify-center' : 'gap-2.5 text-left',
            )}
          >
            <Avatar initials={user.initials || initials(user.name)} size="md" status />
            {!sidebarCollapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-text-primary">{user.name}</span>
                <span className="block truncate text-[10px] text-text-muted">
                  {user.plan} plan · {user.role}
                </span>
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <div className={cn('border-t border-line', sidebarCollapsed ? 'px-3 py-3' : 'px-5 py-4')}>
        <Link
          to="/app/overview"
          aria-label="NuanScape"
          className={cn('inline-flex flex-col opacity-90 transition-opacity hover:opacity-100', sidebarCollapsed && 'items-center')}
        >
          <img
            src="/nuanscape-iso-matrix.png"
            alt="NuanScape"
            width={686}
            height={200}
            className={cn('w-auto object-contain', sidebarCollapsed ? 'h-7' : 'h-8')}
          />
          {!sidebarCollapsed ? (
            <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-text-muted">AI Command Center</span>
          ) : null}
        </Link>
      </div>

      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-3 bottom-28 hidden size-6 place-items-center rounded-full border border-line-strong bg-card text-text-muted shadow-lg transition-colors hover:text-primary lg:grid"
        aria-label={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
      >
        {sidebarCollapsed ? <PanelLeftOpen className="size-3" /> : <PanelLeftClose className="size-3" />}
      </button>
    </aside>
  )
}
