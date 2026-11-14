import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { AreaTrendChart, BarTrendChart } from '@/components/charts/charts'
import { PlatformLogo, platformColor } from '@/features/content/components/content-ui'
import { contentAnalytics, platformAccounts } from '@/data/mock'
import { useContentStore } from '@/stores/content-store'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Platform, PlatformAccount } from '@/types'

const platforms: Platform[] = ['YouTube', 'TikTok', 'Instagram']
type Scope = 'all' | Platform

function AccountFilter({
  accounts,
  scope,
  accountId,
  onChange,
}: {
  accounts: PlatformAccount[]
  scope: Scope
  accountId: string
  onChange: (next: { scope: Scope; accountId: string }) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectedAccount = accountId ? accounts.find((a) => a.id === accountId) : null
  const display = scope === 'all' ? 'Semua akun' : selectedAccount?.name ?? `Semua ${scope}`
  const groups = platforms.map((platform) => ({
    platform,
    accounts: accounts.filter((a) => a.platform === platform),
  }))

  return (
    <div ref={ref} className="relative w-full sm:w-72">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'ring-focus flex h-12 w-full items-center justify-between gap-3 rounded-full border bg-[#141414] pl-5 pr-4 text-left transition-colors',
          open ? 'border-primary/45' : 'border-white/[0.1] hover:border-white/[0.2]',
        )}
      >
        <span className="truncate text-[14px] font-semibold text-white">{display}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-white/50 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="animate-fade-in absolute right-0 top-[calc(100%+8px)] z-50 w-full min-w-[264px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b0b0b] p-2 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)]"
        >
          <div className="max-h-80 overflow-auto">
            <button
              type="button"
              role="option"
              aria-selected={scope === 'all'}
              onClick={() => {
                onChange({ scope: 'all', accountId: '' })
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors',
                scope === 'all'
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-white/70 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <span className="flex-1 truncate">Semua akun</span>
              {scope === 'all' ? <Check className="size-3.5 shrink-0" /> : null}
            </button>

            {groups.map((group) => (
              <div key={group.platform}>
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  {group.platform}
                </p>
                {group.accounts.map((account) => {
                  const active = scope === account.platform && account.id === accountId
                  return (
                    <button
                      key={account.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange({ scope: account.platform, accountId: account.id })
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors',
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-white/70 hover:bg-white/[0.05] hover:text-white',
                      )}
                    >
                      <span className="flex-1 truncate">{account.name}</span>
                      {active ? <Check className="size-3.5 shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ContentAnalyticsHubPage() {
  const linkedAccounts = useContentStore((s) => s.linkedAccounts)
  const isLinked = (id: string) => linkedAccounts[id] !== false
  const [scope, setScope] = React.useState<Scope>('all')
  const [accountId, setAccountId] = React.useState<string>('')

  const allAccounts = platformAccounts.filter((a) => isLinked(a.id))
  const scopedAccounts = scope === 'all' ? allAccounts : allAccounts.filter((a) => a.platform === scope)
  const selected = scope !== 'all' && accountId ? scopedAccounts.find((a) => a.id === accountId) ?? null : null

  const platformStats = platforms.map((platform) => {
    const accounts = allAccounts.filter((a) => a.platform === platform)
    const views = accounts.reduce((t, a) => t + a.views30d, 0)
    const followers = accounts.reduce((t, a) => t + a.followers, 0)
    const engagement = views ? accounts.reduce((t, a) => t + a.engagement * a.views30d, 0) / views : 0
    return { platform, views, followers, engagement, accounts: accounts.length }
  })

  const totalAllViews = platformStats.reduce((t, s) => t + s.views, 0)
  const needsChannel = scope !== 'all' && !selected
  const trendData = contentAnalytics.map((d) => {
    if (selected) {
      const platformTotal = platformStats.find((s) => s.platform === selected.platform)?.views || 1
      const factor = selected.views30d / platformTotal
      const base = d.views * ((platformStats.find((s) => s.platform === selected.platform)?.views || 0) / (totalAllViews || 1))
      return { label: d.label, [selected.platform]: Math.round(base * factor) }
    }
    const share = (p: Platform) => (platformStats.find((s) => s.platform === p)?.views || 0) / (totalAllViews || 1)
    return {
      label: d.label,
      YouTube: Math.round(d.views * share('YouTube')),
      TikTok: Math.round(d.views * share('TikTok')),
      Instagram: Math.round(d.views * share('Instagram')),
    }
  })

  const accountCompare = selected ? [{ name: selected.handle.replace('@', ''), views: selected.views30d }] : []
  const detailRows = selected ? [selected] : []
  const trendSeries = selected ? [{ key: selected.platform, label: selected.platform, color: platformColor[selected.platform] }] : []

  return (
    <div>
      <PageHeader
        title="Analytic"
        description="Analitik 3 platform dan setiap akun."
        actions={
          <AccountFilter
            accounts={allAccounts}
            scope={scope}
            accountId={accountId}
            onChange={({ scope: nextScope, accountId: nextAccountId }) => {
              setScope(nextScope)
              setAccountId(nextAccountId)
            }}
          />
        }
      />

      {scope === 'all' ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {platformStats.map((s) => (
              <Card key={s.platform} className="p-4" style={{ borderColor: `${platformColor[s.platform]}33` }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: platformColor[s.platform] }} className="inline-flex">
                    <PlatformLogo platform={s.platform} className="size-3.5" />
                  </span>
                  <p className="text-[12px] font-semibold text-text-primary">{s.platform}</p>
                  <span className="ml-auto text-[10px] text-text-muted">{s.accounts} akun</span>
                </div>
                <p className="num mt-2 text-[22px] font-semibold text-white">{formatNumber(s.views, true)}</p>
                <p className="text-[10px] text-text-muted">views 30h · {formatNumber(s.followers, true)} followers · {formatPercent(s.engagement)} eng.</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <SectionHeader title="Tren views 3 platform" description="7 hari terakhir" />
              <AreaTrendChart
                data={trendData}
                xKey="label"
                series={platforms.map((p) => ({ key: p, label: p, color: platformColor[p] }))}
                height={280}
                valueFormatter={(v) => formatNumber(v)}
              />
            </Card>
            <Card className="p-5">
              <SectionHeader title="Views per akun" description="Semua akun tertaut" />
              <BarTrendChart
                data={allAccounts.map((a) => ({ name: a.handle.replace('@', ''), views: a.views30d }))}
                xKey="name"
                series={[{ key: 'views', label: 'Views', color: '#F5D64B' }]}
                height={280}
                valueFormatter={(v) => formatNumber(v)}
              />
            </Card>
          </div>

          <Card className="mt-4 p-5">
            <SectionHeader title="Detail per akun" description="Performa setiap akun tertaut" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.1em] text-text-muted">
                    <th className="px-3 py-2.5 font-medium">Akun</th>
                    <th className="px-3 py-2.5 font-medium">Platform</th>
                    <th className="px-3 py-2.5 font-medium text-right">Views 30h</th>
                    <th className="px-3 py-2.5 font-medium text-right">Followers</th>
                    <th className="px-3 py-2.5 font-medium text-right">Engagement</th>
                    <th className="px-3 py-2.5 font-medium text-right">Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {allAccounts.map((a) => (
                    <tr key={a.id} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="text-[12px] font-medium text-text-primary">{a.name}</p>
                        <p className="text-[10px] text-text-muted">{a.handle}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span style={{ color: platformColor[a.platform] }} className="inline-flex">
                            <PlatformLogo platform={a.platform} className="size-3" />
                          </span>
                          {a.platform}
                        </span>
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[12px] text-text-primary">{formatNumber(a.views30d, true)}</td>
                      <td className="num px-3 py-2.5 text-right text-[12px] text-text-secondary">{formatNumber(a.followers, true)}</td>
                      <td className="num px-3 py-2.5 text-right text-[12px]" style={{ color: platformColor[a.platform] }}>{formatPercent(a.engagement)}</td>
                      <td className="px-3 py-2.5 text-right text-[10px] text-text-muted">{formatDate(a.lastSync, 'd MMM HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : needsChannel ? (
        <Card className="p-8 text-center">
          <p className="text-[13px] font-medium text-text-primary">Pilih channel {scope}</p>
          <p className="mt-1 text-[11px] text-text-muted">Pilih channel/akun di filter sebelah kanan untuk menampilkan data analitik.</p>
        </Card>
      ) : selected ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="p-4" style={{ borderColor: `${platformColor[selected.platform]}33` }}>
              <div className="flex items-center gap-2">
                <span style={{ color: platformColor[selected.platform] }} className="inline-flex">
                  <PlatformLogo platform={selected.platform} className="size-3.5" />
                </span>
                <p className="text-[12px] font-semibold text-text-primary">{selected.platform}</p>
              </div>
              <p className="num mt-2 text-[22px] font-semibold text-white">{formatNumber(selected.views30d, true)}</p>
              <p className="text-[10px] text-text-muted">views 30h · {selected.handle}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Followers</p>
              <p className="num mt-2 text-[22px] font-semibold text-white">{formatNumber(selected.followers, true)}</p>
              <p className="text-[10px] text-text-muted">{selected.name}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Engagement</p>
              <p className="num mt-2 text-[22px] font-semibold" style={{ color: platformColor[selected.platform] }}>{formatPercent(selected.engagement)}</p>
              <p className="text-[10px] text-text-muted">{selected.posts30d} post / 30h</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <SectionHeader title={`Tren views - ${selected.handle}`} description="7 hari terakhir" />
              <AreaTrendChart
                data={trendData}
                xKey="label"
                series={trendSeries}
                height={280}
                valueFormatter={(v) => formatNumber(v)}
              />
            </Card>
            <Card className="p-5">
              <SectionHeader title="Views channel" description={selected.handle} />
              <BarTrendChart
                data={accountCompare}
                xKey="name"
                series={[{ key: 'views', label: 'Views', color: platformColor[selected.platform] }]}
                height={280}
                valueFormatter={(v) => formatNumber(v)}
              />
            </Card>
          </div>

          <Card className="mt-4 p-5">
            <SectionHeader title="Detail channel" description="Performa akun terpilih" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.1em] text-text-muted">
                    <th className="px-3 py-2.5 font-medium">Akun</th>
                    <th className="px-3 py-2.5 font-medium">Platform</th>
                    <th className="px-3 py-2.5 font-medium text-right">Views 30h</th>
                    <th className="px-3 py-2.5 font-medium text-right">Followers</th>
                    <th className="px-3 py-2.5 font-medium text-right">Engagement</th>
                    <th className="px-3 py-2.5 font-medium text-right">Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((a) => (
                    <tr key={a.id} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="text-[12px] font-medium text-text-primary">{a.name}</p>
                        <p className="text-[10px] text-text-muted">{a.handle}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span style={{ color: platformColor[a.platform] }} className="inline-flex">
                            <PlatformLogo platform={a.platform} className="size-3" />
                          </span>
                          {a.platform}
                        </span>
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[12px] text-text-primary">{formatNumber(a.views30d, true)}</td>
                      <td className="num px-3 py-2.5 text-right text-[12px] text-text-secondary">{formatNumber(a.followers, true)}</td>
                      <td className="num px-3 py-2.5 text-right text-[12px]" style={{ color: platformColor[a.platform] }}>{formatPercent(a.engagement)}</td>
                      <td className="px-3 py-2.5 text-right text-[10px] text-text-muted">{formatDate(a.lastSync, 'd MMM HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
