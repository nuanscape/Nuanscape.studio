import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { KeyRound, LogOut, Radar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, useAuthStore, useToastStore } from '@/stores/app-store'
import { workspaces, getWorkspaceForPath } from '@/components/navigation/nav-config'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mobileNavOpen, setMobileNavOpen } = useAppStore()
  const { user, logout } = useAuthStore()
  const { push } = useToastStore()
  const activeWorkspace = getWorkspaceForPath(location.pathname)

  React.useEffect(() => {
    if (!mobileNavOpen) return

    const previousBody = document.body.style.overflow
    const previousHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileNavOpen(false)
    }

    document.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onDesktop)

    return () => {
      document.body.style.overflow = previousBody
      document.documentElement.style.overflow = previousHtml
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onDesktop)
    }
  }, [mobileNavOpen, setMobileNavOpen])

  const bottomItems = [
    { label: 'Monitor', href: '/app/monitor', icon: Radar, value: 'monitor' },
    { label: 'Seller', href: '/app/seller/overview', icon: workspaces[1].icon, value: 'seller' },
    { label: 'Content', href: '/app/content/overview', icon: workspaces[2].icon, value: 'content' },
    { label: 'Finance', href: '/app/finance/overview', icon: workspaces[3].icon, value: 'finance' },
  ]

  return (
    <>
      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0a0a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="grid h-[64px] grid-cols-4">
          {bottomItems.map((item) => {
            const active = activeWorkspace.id === item.value
            return (
              <Link key={item.value} to={item.href} aria-current={active ? 'page' : undefined} className={cn('relative flex flex-col items-center justify-center gap-1 text-[9px] font-medium transition-colors', active ? 'text-primary' : 'text-text-muted')}>
                {active ? <span className="absolute top-0 h-[2px] w-8 rounded-b-full bg-primary shadow-[0_0_10px_1px_rgba(245,214,75,0.5)]" /> : null}
                <item.icon className="size-[18px] [stroke-width:1.8]" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <AnimatePresence>
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigasi">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={() => setMobileNavOpen(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="absolute inset-y-0 left-0 flex w-[86%] max-w-[330px] flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
              <div className="flex h-16 items-center justify-between border-b border-line px-5">
                <Link to="/app/monitor" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2.5">
                  <img src="/logo-n-opt.png" alt="NuanScape" width={360} height={133} className="h-5 w-auto object-contain" />
                </Link>
                <button onClick={() => setMobileNavOpen(false)} className="grid size-10 place-items-center rounded-lg text-text-muted hover:bg-white/5" aria-label="Tutup navigasi"><X className="size-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {workspaces.map((workspace) => (
                  <div key={workspace.id} className="mb-5">
                    <div className="mb-1.5 flex items-center gap-2 px-2">
                      <workspace.icon className="size-3.5" style={{ color: workspace.accent }} />
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">{workspace.label}</p>
                    </div>
                    <div className="space-y-0.5">
                      {workspace.items.map((item) => {
                        const active = location.pathname === item.href
                        return (
                          <Link key={item.href} to={item.href} onClick={() => setMobileNavOpen(false)} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors', active ? 'bg-primary/[0.08] font-medium text-primary' : 'text-text-secondary hover:bg-white/[0.035]')}>
                            <item.icon className="size-4 [stroke-width:1.7]" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Link to="/app/profile" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/[0.03]">
                  <Avatar initials={user.initials} size="md" status />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-text-primary">{user.name}</p>
                    <p className="truncate text-[10px] text-text-muted">{user.email}</p>
                  </div>
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setMobileNavOpen(false); navigate(activeWorkspace.id === 'monitor' ? '/app/monitor/settings' : '/app/settings') }}><KeyRound /> {activeWorkspace.id === 'monitor' ? 'API Settings' : 'Settings'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setMobileNavOpen(false); logout(); push({ title: 'Sampai jumpa lagi', tone: 'success' }); navigate('/login', { replace: true }) }}><LogOut /> Keluar</Button>
                </div>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
