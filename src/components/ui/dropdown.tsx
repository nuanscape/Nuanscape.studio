import * as React from 'react'
import { cn } from '@/lib/utils'

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  className,
  width = 'w-56',
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
  width?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open ? (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-50 mt-2 overflow-hidden rounded-xl border border-line-strong bg-card p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] animate-fade-in',
            width,
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownItem({
  className,
  icon,
  children,
  danger,
  onClick,
}: {
  className?: string
  icon?: React.ReactNode
  children: React.ReactNode
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
        danger ? 'text-danger hover:bg-danger/10' : 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  )
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">
      {children}
    </div>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-line" />
}
