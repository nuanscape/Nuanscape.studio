import * as React from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
