import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { searchableRoutes } from '@/components/navigation/nav-config'
import { Dialog } from '@/components/ui/dialog'

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useAppStore()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return searchableRoutes.slice(0, 12)
    return searchableRoutes.filter((r) => r.keywords.includes(q) || r.label.toLowerCase().includes(q)).slice(0, 14)
  }, [query])

  React.useEffect(() => {
    if (!commandOpen) {
      setQuery('')
      setActive(0)
    }
  }, [commandOpen])
  React.useEffect(() => setActive(0), [query])

  const go = (href: string) => {
    setCommandOpen(false)
    navigate(href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[active]) go(results[active].href)
    }
  }

  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? []
    acc[item.group].push(item)
    return acc
  }, {})
  let flatIndex = -1

  return (
    <Dialog open={commandOpen} onClose={() => setCommandOpen(false)} size="lg" className="overflow-hidden">
      <div className="-m-5">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="size-4 text-text-muted" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} placeholder="Cari halaman…" className="h-8 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/70" />
          <kbd className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-text-muted">ESC</kbd>
        </div>
        <div className="max-h-[54dvh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-3 py-10 text-center"><p className="text-sm text-text-secondary">Tidak ada halaman yang cocok.</p></div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[9px] font-medium uppercase tracking-[0.16em] text-text-muted">{group}</p>
                {items.map((item) => {
                  flatIndex += 1
                  const index = flatIndex
                  return (
                    <button key={item.href} onMouseEnter={() => setActive(index)} onClick={() => go(item.href)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors', active === index ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]')}>
                      <span className="grid size-7 place-items-center rounded-lg border border-line bg-white/[0.02] text-text-muted"><item.icon className="size-3.5" /></span>
                      <span className="flex-1 text-[12px] text-text-secondary">{item.label}</span>
                      <span className="text-[10px] text-text-muted">{item.group}</span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[9px] text-text-muted">
          <span className="flex items-center gap-1"><CornerDownLeft className="size-2.5" /> Pilih</span>
          <span>↑↓ Navigasi</span>
          <span className="ml-auto">Tekan ⌘K kapan saja</span>
        </div>
      </div>
    </Dialog>
  )
}
