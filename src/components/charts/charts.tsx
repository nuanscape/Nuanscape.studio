import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn, formatIDR } from '@/lib/utils'

const axisStyle = {
  fontSize: 10,
  fill: '#8a8a8a',
  fontFamily: 'Geist Mono, monospace',
}

function TooltipBox({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  label?: string
  valueFormatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  const fmt = valueFormatter ?? ((v: number) => formatIDR(v))
  return (
    <div className="rounded-xl border border-white/[0.14] bg-[#121212]/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
      {label ? (
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey}-${i}`} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 capitalize text-text-secondary">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="num text-text-primary">{fmt(Number(entry.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface Series {
  key: string
  label: string
  color: string
}

export function AreaTrendChart({
  data,
  xKey,
  series,
  height = 260,
  valueFormatter,
  yFormatter,
  gradient = true,
  showGrid = true,
  className,
}: {
  data: Array<Record<string, string | number>>
  xKey: string
  series: Series[]
  height?: number
  valueFormatter?: (value: number) => string
  yFormatter?: (value: number) => string
  gradient?: boolean
  showGrid?: boolean
  className?: string
}) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={gradient ? 0.28 : 0} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showGrid ? (
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" vertical={false} />
          ) : null}
          <XAxis
            dataKey={xKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            dy={8}
            minTickGap={20}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) => (yFormatter ? yFormatter(v as number) : formatIDR(v as number, { compact: true }).replace('Rp', ''))}
          />
          <Tooltip
            content={<TooltipBox valueFormatter={valueFormatter} />}
            cursor={{ stroke: 'rgba(245,214,75,0.25)', strokeDasharray: '3 3' }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0, fill: s.color }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarTrendChart({
  data,
  xKey,
  series,
  height = 250,
  valueFormatter,
  stacked,
  className,
}: {
  data: Array<Record<string, string | number>>
  xKey: string
  series: Series[]
  height?: number
  valueFormatter?: (value: number) => string
  stacked?: boolean
  className?: string
}) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} dy={8} />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) => formatIDR(v as number, { compact: true }).replace('Rp', '')}
          />
          <Tooltip
            content={<TooltipBox valueFormatter={valueFormatter} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[5, 5, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
              maxBarSize={34}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutChart({
  data,
  height = 220,
  centerLabel,
  centerValue,
  valueFormatter,
}: {
  data: Array<{ name: string; value: number; color: string }>
  height?: number
  centerLabel?: string
  centerValue?: string
  valueFormatter?: (value: number) => string
}) {
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="66%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox valueFormatter={valueFormatter ?? ((v) => formatIDR(v))} />} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-lg font-semibold tracking-tight text-text-primary">{centerValue}</span>
          {centerLabel ? (
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-text-muted">
              {centerLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function Sparkline({
  data,
  dataKey,
  color = '#F5D64B',
  height = 40,
  className,
}: {
  data: Array<Record<string, string | number>>
  dataKey: string
  color?: string
  height?: number
  className?: string
}) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#spark-${dataKey}-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RadialScore({
  value,
  size = 132,
  label,
  color = '#F5D64B',
}: {
  value: number
  size?: number
  label?: string
  color?: string
}) {
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.2,0.7,0.3,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="num text-2xl font-semibold tracking-tight text-text-primary">{Math.round(value)}</span>
        {label ? (
          <span className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-text-muted">{label}</span>
        ) : null}
      </div>
    </div>
  )
}
