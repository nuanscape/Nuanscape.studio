import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'ring-focus h-10 w-full rounded-xl border border-white/[0.09] bg-[#0f0f0f] px-3.5 text-sm text-white placeholder:text-white/30 transition-colors hover:border-white/[0.18] focus:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'ring-focus min-h-[92px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#0f0f0f] px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-white/30 transition-colors hover:border-white/[0.18] focus:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'ring-focus h-10 w-full appearance-none rounded-xl border border-white/[0.09] bg-[#0f0f0f] px-3.5 pr-9 text-sm text-white transition-colors hover:border-white/[0.18] focus:border-primary/45',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
))
Select.displayName = 'Select'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-medium tracking-wide text-text-secondary', className)}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-0', className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'ring-focus relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-primary/40 bg-primary/25' : 'border-line bg-white/5',
      )}
    >
      <span
        className={cn(
          'absolute size-4 rounded-full transition-transform',
          checked ? 'translate-x-[22px] bg-primary' : 'translate-x-1 bg-text-muted',
        )}
      />
    </button>
  )
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'ring-focus grid size-4 place-items-center rounded border transition-colors',
        checked ? 'border-primary bg-primary text-[#0B0B0B]' : 'border-line bg-transparent',
        className,
      )}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m2.5 6 2.3 2.3L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  )
}
