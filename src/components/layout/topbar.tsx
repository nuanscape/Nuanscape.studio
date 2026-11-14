import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Command, LogOut, Menu, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, useAuthStore, useToastStore } from '@/stores/app-store'
import { Avatar } from '@/components/ui/avatar'
import { DropdownItem, DropdownLabel, DropdownMenu, DropdownSeparator } from '@/components/ui/dropdown'
import { getCurrentNavItem, getWorkspaceForPath } from '@/components/navigation/nav-config'

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notifications, setCommandOpen, setMobileNavOpen } = useAppStore()
  const { user, logout } = useAuthStore()
  const { push } = useToastStore()
  const workspace = getWorkspaceForPath(location.pathname)
  const current = getCurrentNavItem(location.pathname)
  const unread = notifications.filter((n) => !n.read).length
  const notificationsHref =
    workspace.id === 'monitor' ? '/app/monitor/notifications' : '/app/notifications'

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <button type="button" onClick={() => setMobileNavOpen(true)} className="ring-focus grid size-10 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary lg:hidden" aria-label="Buka navigasi">
          <Menu className="size-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-[12px]">
          <span className="hidden text-text-muted sm:inline">{workspace.label}</span>
          <span className="hidden text-text-muted/40 sm:inline">/</span>
          <span className="truncate font-medium text-text-primary">{current?.label ?? 'Overview'}</span>
        </div>

        <button type="button" onClick={() => setCommandOpen(true)} className="ring-focus group ml-auto hidden h-9 w-full max-w-[420px] items-center gap-2 rounded-full border border-white/[0.09] bg-[#121212] px-3.5 text-left text-[12px] text-text-muted transition-colors hover:border-white/25 hover:bg-[#181818] md:flex">
          <Search className="size-3.5" />
          <span className="flex-1 truncate">Cari halaman...</span>
          <kbd className="flex items-center gap-0.5 rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-text-muted">
            <Command className="size-2.5" />K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <button type="button" onClick={() => setCommandOpen(true)} className="ring-focus grid size-10 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary md:hidden" aria-label="Cari">
            <Search className="size-4.5" />
          </button>

          <Link to={notificationsHref} className="ring-focus relative grid size-10 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
            <Bell className="size-4.5" />
            {unread > 0 ? <span className="absolute right-1.5 top-1.5 grid min-w-3.5 place-items-center rounded-full bg-primary px-1 text-[8px] font-bold leading-3.5 text-ink">{unread}</span> : null}
          </Link>

          <DropdownMenu
            align="right"
            width="w-60"
            trigger={
              <button className="ring-focus flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/5">
                <Avatar initials={user.initials} size="md" status />
                <span className="hidden text-left xl:block">
                  <span className="block text-[12px] font-medium leading-tight text-text-primary">{user.name.split(' ')[0]}</span>
                  <span className="block text-[10px] leading-tight text-text-muted">{user.plan} plan</span>
                </span>
                <ChevronDown className="hidden size-3 text-text-muted xl:block" />
              </button>
            }
          >
            <DropdownLabel>{user.email}</DropdownLabel>
            <DropdownItem icon={<Settings />} onClick={() => navigate('/app/settings')}>Setting Akun</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={<LogOut />} danger onClick={() => { logout(); push({ title: 'Sampai jumpa lagi', description: 'Kamu sudah keluar. Masuk lagi dengan akun studio.', tone: 'success' }); navigate('/login', { replace: true }) }}>
              Keluar
            </DropdownItem>
          </DropdownMenu>
        </div>
      </div>
      <div className={cn('h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent')} />
    </header>
  )
}
