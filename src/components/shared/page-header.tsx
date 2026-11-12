import * as React from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn, formatPercent } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export type MetricAccent = 'yellow' | 'orange' | 'pink' | 'teal' | 'blue'

const accents: Record<MetricAccent, { bg: string; fg: string; sub: string; chip: string }> = {
  yellow: { bg: '#F5D64B', fg: '#0B0B0B', sub: 'rgba(11,11,11,0.6)', chip: 'rgba(0,0,0,0.1)' },
  orange: { bg: '#F0512B', fg: '#FFFFFF', sub: 'rgba(255,255,255,0.76)', chip: 'rgba(255,255,255,0.16)' },
  pink: { bg: '#F58FD9', fg: '#FFFFFF', sub: 'rgba(255,255,255,0.8)', chip: 'rgba(255,255,255,0.18)' },
  teal: { bg: '#24C7C4', fg: '#FFFFFF', sub: 'rgba(255,255,255,0.8)', chip: 'rgba(255,255,255,0.18)' },
  blue: { bg: '#6DBBFF', fg: '#0B0B0B', sub: 'rgba(11,11,11,0.6)', chip: 'rgba(0,0,0,0.1)' },
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-balance text-[30px] font-extrabold leading-[0.98] tracking-[-0.045em] text-white sm:text-[38px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-2xl text-[12.5px] leading-relaxed text-white/48">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3.5 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-[15px] font-bold tracking-[-0.025em] text-white">{title}</h2>
        {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  hint,
  tone = 'default',
  accent,
  className,
  onClick,
}: {
  label: string
  value: React.ReactNode
  delta?: number
  deltaLabel?: string
  icon?: React.ReactNode
  hint?: string
  tone?: 'default' | 'positive' | 'warning' | 'danger'
  accent?: MetricAccent
  className?: string
  onClick?: () => void
}) {
  const positive = (delta ?? 0) > 0
  const flat = (delta ?? 0) === 0
  const TrendIcon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight
  const toneRing = {
    default: 'text-primary',
    positive: 'text-teal',
    warning: 'text-yellow',
    danger: 'text-orange',
  }

  if (accent) {
    const a = accents[accent]
    return (
      <div
        onClick={onClick}
        className={cn('tile relative overflow-hidden p-4 sm:p-5', onClick && 'cursor-pointer', className)}
        style={{ backgroundColor: a.bg, color: a.fg }}
      >
        <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-[0.16]" style={{ color: a.fg }} />
        {icon ? (
          <div className="pointer-events-none absolute -bottom-6 -right-3 opacity-[0.14] [&_svg]:size-28 [&_svg]:stroke-[1.25]" style={{ color: a.fg }}>
            {icon}
          </div>
        ) : null}
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: a.sub }}>
            {label}
          </p>
          {icon ? (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4"
              style={{ backgroundColor: a.chip, color: a.fg }}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <div className="relative mt-5 num text-[24px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[28px]">
          {value}
        </div>
        <div className="relative mt-3 flex items-center gap-2">
          {delta !== undefined ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: a.chip, color: a.fg }}
            >
              <TrendIcon className="size-3" />
              {formatPercent(Math.abs(delta), false)}
            </span>
          ) : null}
          {deltaLabel || hint ? (
            <span className="truncate text-[10.5px] font-medium" style={{ color: a.sub }}>
              {deltaLabel ?? hint}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={cn('relative overflow-hidden p-4 sm:p-5', className)}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/[0.02] blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
        {icon ? (
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] [&_svg]:size-4',
              toneRing[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="relative mt-5 num text-[24px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[28px]">
        {value}
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        {delta !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              flat ? 'bg-white/5 text-white/50' : positive ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange',
            )}
          >
            <TrendIcon className="size-3" />
            {formatPercent(Math.abs(delta), false)}
          </span>
        ) : null}
        {deltaLabel || hint ? (
          <span className="truncate text-[10.5px] text-white/38">{deltaLabel ?? hint}</span>
        ) : null}
      </div>
    </Card>
  )
}

export function InsightCard({
  title,
  detail,
  why,
  tone = 'neutral',
  action,
  onAction,
}: {
  title: string
  detail: string
  why: string
  tone?: 'positive' | 'warning' | 'neutral' | 'danger'
  action?: string
  onAction?: () => void
}) {
  const [showWhy, setShowWhy] = React.useState(false)
  const toneMap = {
    positive: 'border-teal/20 bg-teal/[0.04]',
    warning: 'border-yellow/20 bg-yellow/[0.04]',
    neutral: 'border-white/[0.07] bg-white/[0.02]',
    danger: 'border-orange/20 bg-orange/[0.04]',
  }
  const dot = {
    positive: 'bg-teal',
    warning: 'bg-yellow',
    neutral: 'bg-info',
    danger: 'bg-orange',
  }
  return (
    <div className={cn('rounded-2xl border p-4 transition-colors', toneMap[tone])}>
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', dot[tone])} />
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold leading-snug text-white">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">{detail}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="text-[11px] font-medium text-primary/85 transition-colors hover:text-primary"
            >
              {showWhy ? 'Sembunyikan alasan' : 'Mengapa?'}
            </button>
            {action ? (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-white/55 transition-colors hover:text-white"
              >
                {action}
                <ArrowRight className="size-3" />
              </button>
            ) : null}
          </div>
          {showWhy ? (
            <p className="mt-2.5 rounded-xl border border-white/[0.06] bg-black/30 p-2.5 text-[10.5px] leading-relaxed text-white/45">
              {why}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
