import * as React from 'react'
import { cn, clamp } from '@/lib/utils'

export function Progress({
  value,
  className,
  tone = 'primary',
  size = 'md',
}: {
  value: number
  className?: string
  tone?: 'primary' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}) {
  const colors = {
    primary: 'bg-primary',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  }
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-full bg-white/[0.06]',
        size === 'sm' ? 'h-1' : 'h-1.5',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', colors[tone])}
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-white/[0.05]',
        'after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent',
        className,
      )}
    />
  )
}

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (!label) return <div className={cn('h-px w-full bg-line', className)} />
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
