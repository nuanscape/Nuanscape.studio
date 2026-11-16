import * as React from 'react'
import { BarChart3, Clock3, Eye, Heart, Sparkles } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { AreaTrendChart, DonutChart } from '@/components/charts/charts'
import { PlatformChip } from '@/features/content/components/content-ui'
import { resolveAccount, useContentScope } from '@/features/content/components/content-flow'
import { contentSummary } from '@/lib/metrics'
import { api } from '@/lib/api-client'
import type { TrendPoint } from '@/stores/content-store'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils'
import { useContentStore } from '@/stores/content-store'

type Period = '7d' | '30d' | '90d'

const accountPalette: Record<string, string[]> = {
  long: ['#F0512B', '#F5D64B'],
  short: ['#24C7C4', '#F5D64B', '#F58FD9', '#6DBBFF'],
}

export function ContentAnalyticsPage() {
  const { format, meta, items, accounts, account } = useContentScope()
  const isLong = format === 'long'
  const [period, setPeriod] = React.useState<Period>('7d')
  const storeTrend = useContentStore((s) => s.trend)
  const [remoteTrend, setRemoteTrend] = React.useState<TrendPoint[] | null>(null)
  React.useEffect(() => {
    let alive = true
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    api.content
      .getAnalytics({ format, days })
      .then((res) => {
        if (alive) {
          setRemoteTrend(Array.isArray(res?.series) ? (res.series as TrendPoint[]) : [])
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [format, period])
  const published = items.filter((i) => i.status === 'Published')
  const summary = contentSummary(items)
  const baseTrend = period === '7d' ? storeTrend[format] : remoteTrend ?? []
  const data = baseTrend.map((d) => ({
    label: d.label,
    views: d.views,
    engagement: d.engagement,
  }))
  const top = [...published].sort((a, b) => b.views - a.views)
  const avgViews = published.length ? summary.views / published.length : 0

  const palette = accountPalette[format]
  const contribution = accounts.map((entry, index) => {
    const views = published
      .filter((item) => resolveAccount(item)?.id === entry.id)
      .reduce((total, item) => total + item.views, 0)
    return { name: entry.handle, value: views, color: palette[index % palette.length] }
  })
  const contributionTotal = contribution.reduce((total, entry) => total + entry.value, 0)
  const donutData = contributionTotal
    ? contribution.map((entry) => ({ ...entry, value: Math.round((entry.value / contributionTotal) * 100) }))
    : []

  return (
    <div>
      <PageHeader
        title={isLong ? 'Analitik long-form' : 'Analitik short-form'}
        description={
          isLong
            ? `Ukur views, engagement, dan watch time episode${account ? ` ${account.handle}` : ''} untuk keputusan konten berikutnya.`
            : `Ukur views, completion, dan engagement klip${account ? ` ${account.handle}` : ''} untuk iterasi batch berikutnya.`
        }
        actions={
          <>
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { label: '7 hari', value: '7d' },
                { label: '30 hari', value: '30d' },
                { label: '90 hari', value: '90d' },
              ]}
            />
            <Button variant="secondary" onClick={() => window.location.assign('/app/monitor')}>
              <Sparkles /> Buka Agent Monitor
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total views" value={formatNumber(summary.views, true)} deltaLabel={`${summary.published} konten tayang`} icon={<Eye />} accent="teal" />
        <MetricCard label="Avg engagement" value={formatPercent(summary.engagement)} deltaLabel="rate rata-rata" icon={<Heart />} tone="positive" accent="yellow" />
        <MetricCard label={isLong ? 'Episode tayang' : 'Klip tayang'} value={`${summary.published} item`} deltaLabel={`avg ${formatNumber(avgViews, true)} views`} icon={<BarChart3 />} accent="pink" />
        <MetricCard label="Dalam produksi" value={`${summary.inProduction} item`} deltaLabel="belum tayang" icon={<Clock3 />} tone="warning" accent="orange" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title={isLong ? 'Views & watch engagement' : 'Views & completion'}
            description={period === '7d' ? 'Data harian 7 hari' : `Data harian ${period}`}
          />
          <AreaTrendChart
            data={data}
            xKey="label"
            series={[
              { key: 'views', label: 'Views', color: meta.accent },
              { key: 'engagement', label: 'Engagement %', color: '#6DBBFF' },
            ]}
            height={270}
            valueFormatter={(v) => formatNumber(v)}
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Kontribusi akun" description={`Porsi views ${meta.platforms.join(' & ')}`} />
          {donutData.length > 0 ? (
            <DonutChart data={donutData} height={190} centerValue={formatNumber(summary.views, true)} centerLabel="views" />
          ) : (
            <p className="py-10 text-center text-[11px] text-text-muted">Belum ada views dari akun terhubung.</p>
          )}
          <div className="mt-3 space-y-2">
            {donutData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="flex-1 truncate text-text-secondary">{entry.name}</span>
                <span className="num text-text-primary">{entry.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <SectionHeader
              title={isLong ? 'Performa per episode' : 'Performa per klip'}
              description={`${published.length} ${isLong ? 'episode' : 'klip'} tayang`}
              className="mb-0"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-line bg-white/[0.02] text-[9px] uppercase tracking-[0.1em] text-text-muted">
                  <th className="px-4 py-2.5 text-left font-medium">{isLong ? 'Episode' : 'Klip'}</th>
                  <th className="px-4 py-2.5 text-left font-medium">Akun</th>
                  <th className="px-4 py-2.5 text-right font-medium">Views</th>
                  <th className="px-4 py-2.5 text-right font-medium">Engagement</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {top.map((item) => (
                  <tr key={item.id} className="border-b border-line/60 last:border-0">
                    <td className="max-w-[240px] px-4 py-2.5">
                      <p className="truncate text-[11px] text-text-primary">{item.title}</p>
                      <p className="text-[9px] text-text-muted">{item.niche}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <PlatformChip platform={item.platform} />
                        <span className="truncate text-[9px] text-text-muted">{resolveAccount(item)?.handle}</span>
                      </div>
                    </td>
                    <td className="num px-4 py-2.5 text-right text-[11px] text-text-primary">{formatNumber(item.views, true)}</td>
                    <td className="num px-4 py-2.5 text-right text-[11px] text-primary">{item.engagement}%</td>
                    <td className="hidden px-4 py-2.5 text-right text-[10px] text-text-muted sm:table-cell">{formatDate(item.scheduledAt, 'd MMM')}</td>
                  </tr>
                ))}
                {published.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[11px] text-text-muted">Belum ada konten published.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  )
}
