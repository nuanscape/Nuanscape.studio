import { cn } from '@/lib/utils'

export function Avatar({
  initials,
  size = 'md',
  className,
  status,
}: {
  initials: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  status?: boolean
}) {
  const sizes = {
    sm: 'size-7 text-[10px]',
    md: 'size-9 text-xs',
    lg: 'size-12 text-sm',
    xl: 'size-20 text-xl',
  }
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-full border border-primary/25 bg-gradient-to-br from-[#1b4a52] to-[#0b2735] font-semibold tracking-wide text-primary-soft',
          sizes[size],
        )}
      >
        {initials}
      </span>
      {status ? (
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-primary" />
      ) : null}
    </span>
  )
}
