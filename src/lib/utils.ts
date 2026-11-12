import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIDR(value: number, opts?: { compact?: boolean; decimals?: boolean }) {
  if (!Number.isFinite(value)) return 'Rp0'
  if (opts?.compact) {
    const abs = Math.abs(value)
    if (abs >= 1_000_000_000) return `Rp${trim(value / 1_000_000_000)} M`
    if (abs >= 1_000_000) return `Rp${trim(value / 1_000_000)} jt`
    if (abs >= 1_000) return `Rp${trim(value / 1_000)} rb`
    return `Rp${Math.round(value)}`
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })
    .format(value)
    .replace('IDR', 'Rp')
    .replace(/\s/g, '')
}

function trim(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

export function formatNumber(value: number, compact = false) {
  if (compact) {
    return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatPercent(value: number, withSign = false) {
  const sign = withSign && value > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: localeID })
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return `Hari ini · ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Kemarin · ${format(d, 'HH:mm')}`
  return formatDistanceToNow(d, { addSuffix: true, locale: localeID })
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function pct(part: number, total: number) {
  if (!total) return 0
  return (part / total) * 100
}

export function daysFromNow(days: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export function dateOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
