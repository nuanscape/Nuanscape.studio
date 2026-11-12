import { cn } from '@/lib/utils'

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { label: string; value: T; icon?: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#0f0f0f] p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'ring-focus inline-flex items-center gap-1.5 rounded-full font-semibold transition-all [&_svg]:size-3.5',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
              active ? 'bg-white text-ink' : 'text-white/45 hover:text-white',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export const Segmented = SegmentedControl

