import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IosTone = 'mint' | 'amber' | 'sky' | 'green' | 'violet' | 'indigo' | 'slate' | 'rose' | 'blue'

const TONES: Record<IosTone, string> = {
  mint: 'bg-[#3DAF93]',
  amber: 'bg-[#C0913D]',
  sky: 'bg-[#4A87B8]',
  green: 'bg-[#4B9670]',
  violet: 'bg-[#7F6EBC]',
  indigo: 'bg-[#5F6FAF]',
  slate: 'bg-[#66707B]',
  rose: 'bg-[#B36B7E]',
  blue: 'bg-[#4478AE]',
}

const SIZES = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-14',
} as const

const ACCENT_TONES: { accent: string; tone: IosTone }[] = [
  { accent: '#f5d64b', tone: 'mint' },
  { accent: '#34d399', tone: 'green' },
  { accent: '#fbbf24', tone: 'amber' },
  { accent: '#7dd3fc', tone: 'sky' },
]

export function toneFromAccent(accent: string): IosTone {
  const key = accent.toLowerCase()
  return ACCENT_TONES.find((entry) => entry.accent === key)?.tone ?? 'indigo'
}

export function IosIcon({
  icon: Icon,
  tone = 'mint',
  size = 'md',
  className,
  glyphClassName,
  title,
}: {
  icon: LucideIcon
  tone?: IosTone
  size?: keyof typeof SIZES
  className?: string
  glyphClassName?: string
  title?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden text-white ring-1 ring-inset ring-white/12',
        TONES[tone],
        SIZES[size],
        className,
      )}
      style={{ borderRadius: '28%' }}
      title={title}
    >
      <Icon className={cn('relative size-[52%]', glyphClassName)} strokeWidth={2.2} />
    </span>
  )
}
