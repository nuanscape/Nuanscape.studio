import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'ring-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-[#0B0B0B] shadow-[0_8px_24px_-10px_rgba(245,214,75,0.55)] hover:bg-primary-soft',
        secondary:
          'border border-white/[0.1] bg-white/[0.055] text-white hover:border-white/[0.2] hover:bg-white/[0.09]',
        outline:
          'border border-white/[0.14] bg-transparent text-white hover:border-primary/45 hover:bg-primary/[0.06]',
        ghost: 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary',
        soft: 'bg-primary/10 text-primary hover:bg-primary/15',
        danger: 'bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
