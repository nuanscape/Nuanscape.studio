import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 tracking-tight whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'border-white/[0.1] bg-white/[0.05] text-white/65',
        primary: 'border-primary/25 bg-primary/10 text-primary',
        success: 'border-teal/25 bg-teal/10 text-teal',
        warning: 'border-yellow/25 bg-yellow/10 text-yellow',
        danger: 'border-orange/25 bg-orange/10 text-orange',
        info: 'border-info/25 bg-info/10 text-info',
        outline: 'border-white/[0.1] bg-transparent text-white/55',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

export function Dot({ className, color }: { className?: string; color?: string }) {
  return (
    <span
      className={cn('inline-block size-1.5 rounded-full', className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}
