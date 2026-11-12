import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  Eye,
  Film,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader, InsightCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AreaTrendChart, DonutChart } from '@/components/charts/charts'
import { PlatformChip } from '@/features/content/components/content-ui'
import {
  accountsForFormat,
  allFormats,
  contentFormats,
  formatBasePath,
  formatForPlatform,
  resolveAccount,
} from '@/features/content/components/content-flow'
import { useContentStore } from '@/stores/content-store'
import { contentSummary } from '@/lib/metrics'
import { contentAnalytics, contentInsights } from '@/data/mock'
import { cn, formatDate, formatNumber, formatPercent } from '@/lib/utils'

export function ContentOverviewPage() {
  const { items } = useContentStore()

  const summary = contentSummary(items)
  const published = items.filter((i) => i.status === 'Published')
  const longItems = items.filter((i) => formatForPlatform(i.platform) === 'long')
  const shortItems = items.filter((i) => formatForPlatform(i.platform) === 'short')

  const viewsLong = published
    .filter((i) => formatForPlatform(i.platform) === 'long')
    .reduce((total, i) => total + i.views, 0)
  const viewsShort = published
    .filter((i) => formatForPlatform(i.platform) === 'short')
    .reduce((total, i) => total + i.views, 0)
  const viewsTotal = viewsLong + viewsShort
  const longShare = viewsTotal ? viewsLong / viewsTotal : 0
  const shortShare = viewsTotal ? viewsShort / viewsTotal : 0

  const formatMix = [
    { name: 'Long-form', value: Math.round(longShare * 100), color: contentFormats.long.accent },
    { name: 'Short-form', value: Math.round(shortShare * 100), color: contentFormats.short.accent },
  ]

  const chartData = contentAnalytics.map((d) => ({
    label: d.label,
    long: Math.round(d.views * longShare),
    short: Math.round(d.views * shortShare),
  }))

  const formatStats = allFormats.map((meta) => {
    const key = meta.id
    const list = key === 'long' ? longItems : shortItems
    const stats = contentSummary(list)
    const accounts = accountsForFormat(key)
    const pipeline = items
      .filter((i) => formatForPlatform(i.platform) === key && i.status !== 'Published')
      .sort((a, b) => (a.scheduledAt > b.scheduledAt ? 1 : -1))
      .slice(0, 2)
    return { key, meta, stats, accounts, pipeline }
  })

  return (
    <div>
      <PageHeader
        title="Content command center"
        description="Dua flow terpisah: long-form YouTube dan short-form TikTok & Reels — pilih jalur sesuai format, bukan mencampur pipeline."
        actions={
          <>
            <Link to={`${formatBasePath('long')}/research`} className={buttonVariants({ variant: 'secondary' })}>
              <Sparkles /> Riset long-form
            </Link>
            <Link to={formatBasePath('short')} className={buttonVariants()}>
              <Clapperboard /> Buka short-form
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total views" value={formatNumber(summary.views, true)} delta={18.6} deltaLabel="7 hari terakhir" icon={<Eye />} accent="teal" />
        <MetricCard label="Avg engagement" value={formatPercent(summary.engagement)} delta={2.4} deltaLabel="di atas rata-rata" icon={<TrendingUp />} tone="positive" accent="yellow" />
        <MetricCard label="Published" value={`${summary.published} konten`} deltaLabel={`${longItems.length} long · ${shortItems.length} short`} icon={<Film />} accent="pink" />
        <MetricCard label="Akun dikelola" value={`${accountsForFormat('long').length + accountsForFormat('short').length} akun`} deltaLabel={`${summary.inProduction} item in production`} icon={<Users />} tone="warning" accent="orange" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {formatStats.map(({ key, meta, stats, accounts, pipeline }) => (
          <Card key={key} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl border"
                  style={{ backgroundColor: `${meta.accent}1a`, borderColor: `${meta.accent}40`, color: meta.accent }}
                >
                  {key === 'long' ? <Film className="size-5" /> : <Clapperboard className="size-5" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-text-primary">{meta.label}</p>
                  <p className="truncate text-[10px] text-text-muted">{meta.tagline} · {meta.platforms.join(' · ')}</p>
                </div>
              </div>
              <Badge tone="outline">{stats.published} tayang</Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Views', value: formatNumber(stats.views, true) },
                { label: 'Engagement', value: formatPercent(stats.engagement) },
                { label: key === 'long' ? 'Produksi' : 'Batch', value: `${stats.inProduction} item` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                  <p className="num text-[13px] font-semibold text-text-primary">{stat.value}</p>
                  <p className="mt-0.5 text-[9px] text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] text-text-muted">
                <span>Progress tayang</span>
                <span className="num">{stats.total ? Math.round((stats.published / stats.total) * 100) : 0}%</span>
              </div>
              <Progress value={stats.total ? (stats.published / stats.total) * 100 : 0} size="sm" className="mt-1.5" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {meta.stages.map((stage) => (
                <Link
                  key={stage.key}
                  to={`${formatBasePath(key)}/${stage.key}`}
                  className="group flex items-center gap-1.5 rounded-lg border border-line/70 bg-white/[0.01] px-2 py-1.5 text-[10px] text-text-secondary transition-colors hover:border-line-strong hover:text-text-primary"
                >
                  <span className="size-1 rounded-full" style={{ backgroundColor: meta.accent }} />
                  <span className="min-w-0 flex-1 truncate">{stage.label}</span>
                  <ArrowRight className="size-3 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Akun</p>
              <div className="mt-1.5 space-y-1.5">
                {accounts.map((account) => {
                  const count = (key === 'long' ? longItems : shortItems).filter(
                    (item) => resolveAccount(item)?.id === account.id,
                  ).length
                  return (
                    <Link
                      key={account.id}
                      to={`/app/content/accounts/${account.id}`}
                      className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.03]"
                    >
                      <PlatformChip platform={account.platform} />
                      <span className="min-w-0 flex-1 truncate text-[10px] text-text-secondary">{account.handle}</span>
                      <span className="num shrink-0 text-[9px] text-text-muted">{formatNumber(account.followers, true)}</span>
                      <span className="num w-8 shrink-0 text-right text-[9px] text-text-muted">{count}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {pipeline.length ? (
              <div className="mt-3 rounded-lg border border-line bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Terdekat</p>
                <div className="mt-1 space-y-1">
                  {pipeline.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-[10px]">
                      <span className="min-w-0 flex-1 truncate text-text-primary">{item.title}</span>
                      <span className="shrink-0 text-[9px] text-text-muted">{formatDate(item.scheduledAt, 'd MMM')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-auto flex items-center gap-2 pt-4">
              <Link to={formatBasePath(key)} className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}>
                Buka flow <ArrowRight />
              </Link>
              <Link
                to={`${formatBasePath(key)}/${key === 'long' ? 'research' : 'ideas'}`}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                {key === 'long' ? 'Riset' : 'Ide'} <ArrowUpRight />
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Views per format"
            description="Kontribusi long-form vs short-form, 7 hari"
            action={<Link to={`${formatBasePath('short')}/analytics`} className="text-[10px] text-primary">Analitik</Link>}
          />
          <AreaTrendChart
            data={chartData}
            xKey="label"
            series={[
              { key: 'long', label: 'Long-form', color: contentFormats.long.accent },
              { key: 'short', label: 'Short-form', color: contentFormats.short.accent },
            ]}
            height={250}
            valueFormatter={(v) => formatNumber(v)}
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Format mix" description="Distribusi views" />
          <DonutChart
            data={formatMix}
            height={170}
            centerValue={formatNumber(viewsTotal, true)}
            centerLabel="total views"
            valueFormatter={(v) => `${v}%`}
          />
          <div className="mt-3 space-y-2">
            {formatMix.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="flex-1 text-text-secondary">{entry.name}</span>
                <span className="num text-text-primary">{entry.value}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
            YouTube menyumbang {formatNumber(viewsLong, true)} views dari {formatNumber(viewsTotal, true)} total.
            Short-form punya volume lebih besar per konten, jadi jaga ritme batch harian.
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="AI content intelligence"
            description="Saran dengan alasan yang bisa dicek"
            action={<button onClick={() => window.location.assign('/app/monitor')} className="text-[10px] text-primary">Buka Monitor</button>}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {contentInsights.slice(0, 4).map((insight) => (
              <InsightCard key={insight.id} {...insight} onAction={() => window.location.assign('/app/monitor')} />
            ))}
          </div>
        </Card>
        <Card className="relative flex h-full flex-col overflow-hidden border-0 bg-primary p-5 text-ink">
          <div className="halftone pointer-events-none absolute inset-0 text-black/15" />
          <Sparkles className="pointer-events-none absolute -bottom-5 -right-3 size-32 text-black/10" strokeWidth={1.25} />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">Next best action</p>
          <h3 className="relative mt-2 text-[18px] font-extrabold leading-snug tracking-[-0.02em] text-black">
            Jalankan satu flow sampai selesai sebelum pindah format.
          </h3>
          <p className="relative mt-2 text-[11px] leading-relaxed text-black/65">
            Long-form sedang di {contentSummary(longItems).inProduction} tahap produksi, short-form punya{' '}
            {contentSummary(shortItems).inProduction} item di batch. Selesaikan pipeline short-form dulu agar
            jadwal posting tidak menumpuk.
          </p>
          <div className="relative mt-4 space-y-1.5">
            {formatStats.map(({ key, meta, stats }) => (
              <Link
                key={key}
                to={formatBasePath(key)}
                className="flex items-center gap-2 rounded-xl bg-black/[0.07] px-3 py-2 transition-colors hover:bg-black/[0.11]"
              >
                <span className="min-w-0 flex-1 text-[10px] font-semibold text-black/80">{meta.label}</span>
                <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-bold text-black/70">
                  {stats.inProduction} aktif
                </span>
                <ArrowRight className="size-3 shrink-0 text-black/40" />
              </Link>
            ))}
          </div>
          <div className="relative mt-auto flex flex-col gap-2 pt-4">
            <Link
              to={`${formatBasePath('short')}/drafts`}
              className={cn(buttonVariants({ size: 'sm' }), 'w-full bg-ink text-white hover:bg-ink/90')}
            >
              <Clapperboard /> Buka batch board <ArrowRight />
            </Link>
            <Button variant="ghost" size="sm" className="text-black/65 hover:bg-black/10 hover:text-black" onClick={() => window.location.assign('/app/monitor')}>
              Buka Agent Monitor
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
