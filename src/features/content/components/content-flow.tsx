import * as React from 'react'
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  FlaskConical,
  Layers,
  LibraryBig,
  Lightbulb,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { platformAccounts } from '@/data/mock'
import { useContentStore } from '@/stores/content-store'
import type {
  ContentFormat,
  ContentIdea,
  ContentItem,
  LibraryAsset,
  Platform,
  PlatformAccount,
} from '@/types'

export interface ContentStage {
  key: string
  label: string
  icon: LucideIcon
}

export interface ContentFormatMeta {
  id: ContentFormat
  label: string
  shortLabel: string
  tagline: string
  description: string
  accent: string
  platforms: Platform[]
  stageHint: string
  metrics: {
    views: string
    depth: string
    output: string
    quality: string
  }
}

const longStages: ContentStage[] = [
  { key: 'research', label: 'Riset', icon: FlaskConical },
  { key: 'ideas', label: 'Ide', icon: Lightbulb },
  { key: 'scripts', label: 'Naskah', icon: PenLine },
  { key: 'studio', label: 'Studio', icon: Clapperboard },
  { key: 'drafts', label: 'Produksi', icon: CheckSquare },
  { key: 'calendar', label: 'Kalender', icon: CalendarDays },
  { key: 'library', label: 'Library', icon: LibraryBig },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const shortStages: ContentStage[] = [
  { key: 'research', label: 'Tren', icon: FlaskConical },
  { key: 'ideas', label: 'Ide', icon: Lightbulb },
  { key: 'scripts', label: 'Hook', icon: PenLine },
  { key: 'studio', label: 'Studio', icon: Clapperboard },
  { key: 'drafts', label: 'Batch', icon: CheckSquare },
  { key: 'calendar', label: 'Kalender', icon: CalendarDays },
  { key: 'library', label: 'Library', icon: LibraryBig },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export const contentFormats: Record<ContentFormat, ContentFormatMeta & { stages: ContentStage[] }> = {
  long: {
    id: 'long',
    label: 'Long-form',
    shortLabel: 'Long',
    tagline: 'YouTube deep-dive',
    description: 'Riset mendalam, naskah panjang, produksi sinematik, dan publikasi video YouTube.',
    accent: '#F0512B',
    platforms: ['YouTube'],
    stageHint: 'Alur panjang: riset → naskah → produksi → publikasi.',
    metrics: {
      views: 'Views 30 hari',
      depth: 'Avg watch time',
      output: 'Upload 30 hari',
      quality: 'Engagement',
    },
    stages: longStages,
  },
  short: {
    id: 'short',
    label: 'Short-form',
    shortLabel: 'Short',
    tagline: 'TikTok & Reels',
    description: 'Hook cepat, batch produksi vertikal, dan publikasi harian untuk TikTok serta Instagram.',
    accent: '#24C7C4',
    platforms: ['TikTok', 'Instagram'],
    stageHint: 'Alur pendek: hook → batch → posting harian.',
    metrics: {
      views: 'Views 30 hari',
      depth: 'Completion rate',
      output: 'Post 30 hari',
      quality: 'Engagement',
    },
    stages: shortStages,
  },
}

export const allFormats: Array<ContentFormatMeta & { stages: ContentStage[] }> = [
  contentFormats.long,
  contentFormats.short,
]

export function formatForPlatform(platform: Platform): ContentFormat {
  return platform === 'YouTube' ? 'long' : 'short'
}

export function formatBasePath(format: ContentFormat): string {
  return `/app/content/${format === 'long' ? 'long-form' : 'short-form'}`
}

export function resolveAccount(row: { platform: Platform; accountId?: string }): PlatformAccount | undefined {
  const direct = row.accountId ? platformAccounts.find((account) => account.id === row.accountId) : undefined
  if (direct) return direct
  return platformAccounts.find((account) => account.platform === row.platform)
}

export function resolveFormat(row: { platform: Platform; accountId?: string }): ContentFormat {
  return resolveAccount(row)?.format ?? formatForPlatform(row.platform)
}

export function accountsForFormat(format: ContentFormat): PlatformAccount[] {
  return platformAccounts.filter((account) => account.format === format)
}

export function defaultAccountForPlatform(platform: Platform): string | undefined {
  return platformAccounts.find((account) => account.platform === platform)?.id
}

const ContentFormatContext = React.createContext<ContentFormat>('long')

export function useActiveFormat(): ContentFormat {
  const { pathname } = useLocation()
  return pathname.includes('/content/short-form') ? 'short' : 'long'
}

export function useContentFormat() {
  const format = React.useContext(ContentFormatContext)
  const meta = contentFormats[format]
  const basePath = formatBasePath(format)
  return {
    format,
    meta,
    basePath,
    stagePath: (stage: string) => `${basePath}/${stage}`,
    isLong: format === 'long',
  }
}

export interface ContentScope {
  format: ContentFormat
  meta: ContentFormatMeta & { stages: ContentStage[] }
  accounts: PlatformAccount[]
  accountId: string | null
  account: PlatformAccount | null
  items: ContentItem[]
  ideas: ContentIdea[]
  library: LibraryAsset[]
  stagePath: (stage: string) => string
}

export function useContentScope(): ContentScope {
  const { format, meta, stagePath } = useContentFormat()
  const [params] = useSearchParams()
  const items = useContentStore((s) => s.items)
  const ideas = useContentStore((s) => s.ideas)
  const library = useContentStore((s) => s.library)
  const accounts = React.useMemo(() => accountsForFormat(format), [format])
  const requested = params.get('account')
  const accountId = requested && accounts.some((account) => account.id === requested) ? requested : null
  const account = accountId ? accounts.find((account) => account.id === accountId) ?? null : null

  return React.useMemo(() => {
    const inScope = (row: { platform: Platform; accountId?: string }) => {
      if (resolveFormat(row) !== format) return false
      if (!accountId) return true
      return resolveAccount(row)?.id === accountId
    }
    return {
      format,
      meta,
      accounts,
      accountId,
      account,
      items: items.filter(inScope),
      ideas: ideas.filter(inScope),
      library: library.filter(inScope),
      stagePath: (stage: string) => `${stagePath(stage)}${accountId ? `?account=${accountId}` : ''}`,
    }
  }, [account, accountId, accounts, format, ideas, items, library, meta, stagePath])
}

export function ContentFormatProvider({
  format,
  children,
}: {
  format: ContentFormat
  children: React.ReactNode
}) {
  return <ContentFormatContext.Provider value={format}>{children}</ContentFormatContext.Provider>
}

export function ContentFormatBadge({
  format,
  className,
}: {
  format: ContentFormat
  className?: string
}) {
  const meta = contentFormats[format]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]',
        className,
      )}
      style={{ borderColor: `${meta.accent}44`, color: meta.accent, backgroundColor: `${meta.accent}14` }}
    >
      <Layers className="size-3" />
      {meta.label}
    </span>
  )
}

function AccountSwitcher({
  format,
  accounts,
  accountId,
}: {
  format: ContentFormat
  accounts: PlatformAccount[]
  accountId: string | null
}) {
  const [params, setParams] = useSearchParams()

  const setAccount = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('account', id)
    else next.delete('account')
    setParams(next, { replace: true })
  }

  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        onClick={() => setAccount(null)}
        aria-pressed={!accountId}
        className={cn(
          'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
          !accountId
            ? 'border-white/15 bg-white/[0.08] text-text-primary'
            : 'border-line text-text-muted hover:border-white/15 hover:text-text-secondary',
        )}
      >
        Semua akun · {accounts.length}
      </button>
      {accounts.map((account) => {
        const active = accountId === account.id
        return (
          <button
            key={account.id}
            type="button"
            onClick={() => setAccount(account.id)}
            aria-pressed={active}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
              active
                ? 'border-white/15 bg-white/[0.08] text-text-primary'
                : 'border-line text-text-muted hover:border-white/15 hover:text-text-secondary',
            )}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: contentFormats[format].accent }} />
            {account.handle}
          </button>
        )
      })}
    </div>
  )
}

export function ContentFormatLayout() {
  const format = useActiveFormat()
  const meta = contentFormats[format]
  const basePath = formatBasePath(format)
  const [params] = useSearchParams()
  const accounts = accountsForFormat(format)
  const requested = params.get('account')
  const accountId = requested && accounts.some((account) => account.id === requested) ? requested : null

  return (
    <ContentFormatProvider format={format}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-surface/50 p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted">Content flow</p>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-tight text-text-primary lg:text-[22px]">{meta.label}</h1>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: meta.accent, backgroundColor: `${meta.accent}18` }}
                >
                  {meta.tagline}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-text-muted">{meta.description}</p>
            </div>
            <div className="w-full max-w-full lg:max-w-[420px]">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">Akun</p>
              <AccountSwitcher format={format} accounts={accounts} accountId={accountId} />
            </div>
          </div>

          <nav className="mt-4 flex items-center gap-1 overflow-x-auto border-t border-line pt-3" aria-label={`Tahap ${meta.label}`}>
            {meta.stages.map((stage) => (
              <NavLink
                key={stage.key}
                to={`${basePath}/${stage.key}${accountId ? `?account=${accountId}` : ''}`}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.08] text-text-primary'
                      : 'text-text-muted hover:bg-white/[0.04] hover:text-text-secondary',
                  )
                }
              >
                <stage.icon className="size-3.5 [stroke-width:1.8]" />
                {stage.label}
              </NavLink>
            ))}
          </nav>
        </section>

        <Outlet />
      </div>
    </ContentFormatProvider>
  )
}
