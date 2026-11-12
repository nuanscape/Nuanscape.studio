import * as React from 'react'
import { cn } from '@/lib/utils'

const TabsContext = React.createContext<{ value: string; onValueChange?: (v: string) => void }>({
  value: '',
})

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#0f0f0f] p-1',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(TabsContext)
  const active = ctx.value === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        'ring-focus inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
        active ? 'bg-white text-ink' : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return (
    <div role="tabpanel" className={cn('animate-fade-in', className)}>
      {children}
    </div>
  )
}
