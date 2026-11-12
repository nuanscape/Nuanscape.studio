import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clapperboard, Eye, Plus, Sparkles, TrendingUp, Users } from 'lucide-react'
import { MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ContentStatusBadge, PlatformChip } from '@/features/content/components/content-ui'
import { ContentFormatBadge, useContentScope } from '@/features/content/components/content-flow'
import { cn, formatDate, formatNumber, formatPercent } from '@/lib/utils'
import type { ContentFormat, PlatformAccount } from '@/types'

function accountDepth(format: ContentFormat, account: PlatformAccount) {
  return format === 'long' ? account.avgWatchMinutes : account.completionRate
}

function formatDepth(format: ContentFormat, value: number) {
  return format === 'long' ? `${value.toFixed(1)} mnt` : formatPercent(value, false)
}

const stageHints: Record<ContentFormat, Record<string, string>> = {
  long: {
    research: 'Riset topik & kompetitor',
    ideas: 'Kurasi ide panjang',
    scripts: 'Outline bab & timestamp',
    studio: 'Rekam & susun episode',
    drafts: 'Editing sampai siap tayang',
    calendar: 'Jadwal upload',
    library: 'Master & thumbnail',
    analytics: 'Watch time & CTR',
  },
  short: {
    research: 'Tren audio & format',
    ideas: 'Ide hook cepat',
    scripts: 'Hook, beat, CTA',
    studio: 'Rekam vertikal',
    drafts: 'Batch edit & caption',
    calendar: 'Kalender posting',
    library: 'Klip & caption',
    analytics: 'Completion & shares',
  },
}

export function ContentFormatHubPage() {
  const { format, meta, accounts, items, ideas, library, accountId, stagePath } = useContentScope()
  const published = items.filter((item) => item.status === 'Published')
  const views = published.reduce((total, item) => total + item.views, 0)
  const engagement = published.length
    ? published.reduce((total, item) => total + item.engagement, 0) / published.length
    : 0
  const depth = accounts.length
    ? accounts.reduce((total, account) => total + accountDepth(format, account), 0) / accounts.length
    : 0
  const output = accounts.reduce((total, account) => total + account.posts30d, 0)
  const upcoming = [...items]
    .filter((item) => item.status !== 'Published' && item.status !== 'Failed')
    .sort((a, b) => (a.scheduledAt > b.scheduledAt ? 1 : -1))
    .slice(0, 4)
  const top = [...published].sort((a, b) => b.views - a.views).slice(0, 4)
  const hints = stageHints[format]

  const stageCounts: Record<string, number> = {
    research: ideas.length,
    ideas: ideas.filter((idea) => !idea.approved).length,
    scripts: items.filter((item) => Boolean(item.script)).length,
    studio: items.filter((item) => ['Production', 'Editing', 'Review'].includes(item.status)).length,
    drafts: items.filter((item) => item.status !== 'Published').length,
    calendar: upcoming.length,
    library: library.length,
    analytics: published.length,
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          title={accountId ? `Ringkasan akun ${meta.shortLabel}` : `Ringkasan ${meta.label}`}
          description={accountId ? 'Angka mengikuti akun yang dipilih di atas.' : meta.stageHint}
          className="mb-0"
        />
        <div className="flex items-center gap-2">
          <ContentFormatBadge format={format} />
          <Link to="/app/content/accounts" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>
            <Users /> Kelola akun
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={meta.metrics.views}
          value={formatNumber(views, true)}
          delta={12.4}
          deltaLabel="30 hari terakhir"
          icon={<Eye />}
          accent={format === 'long' ? 'orange' : 'teal'}
        />
        <MetricCard
          label={meta.metrics.depth}
          value={formatDepth(format, depth)}
          delta={format === 'long' ? 4.2 : 6.8}
          deltaLabel={format === 'long' ? 'dibanding bulan lalu' : 'di atas baseline'}
          icon={<TrendingUp />}
          tone="positive"
          accent="yellow"
        />
        <MetricCard
          label={meta.metrics.output}
          value={`${output} konten`}
          deltaLabel={`dari ${accounts.length} akun`}
          icon={<Clapperboard />}
          accent="pink"
        />
        <MetricCard
          label={meta.metrics.quality}
          value={formatPercent(engagement)}
          deltaLabel={`${published.length} konten tayang`}
          icon={<Sparkles />}
          accent="blue"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Akun di flow ini" description="Angka 30 hari per akun" />
          <div className="space-y-2.5">
            {accounts.map((account) => (
              <Link
                key={account.id}
                to={`/app/content/accounts/${account.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-3 transition-colors hover:border-white/15"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12px] font-medium text-text-primary">{account.name}</p>
                    <PlatformChip platform={account.platform} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    {formatNumber(account.followers, true)} followers · {formatNumber(account.views30d, true)} views
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-[12px] font-medium text-text-primary">
                    {formatDepth(format, accountDepth(format, account))}
                  </p>
                  <p className="text-[9px] text-text-muted">{meta.metrics.depth}</p>
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-text-muted" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Alur produksi"
            description="Klik tahap untuk masuk ke workspace-nya"
            action={
              <Link to={stagePath('ideas')} className="text-[10px] text-primary">
                Mulai dari ide
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {meta.stages.map((stage) => (
              <Link
                key={stage.key}
                to={stagePath(stage.key)}
                className="group rounded-xl border border-line bg-white/[0.02] p-3 transition-colors hover:border-white/15"
              >
                <div className="flex items-center justify-between">
                  <stage.icon className="size-4 text-text-muted [stroke-width:1.8]" />
                  <span className="num text-[13px] font-semibold text-text-primary">{stageCounts[stage.key] ?? 0}</span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-text-primary">{stage.label}</p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-text-muted">{hints[stage.key]}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Jadwal terdekat"
            description="Urut berdasarkan tanggal"
            action={
              <Link to={stagePath('calendar')} className="text-[10px] text-primary">
                Kalender
              </Link>
            }
          />
          <div className="space-y-2.5">
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada jadwal di flow ini.</p>
            ) : (
              upcoming.map((item) => (
                <Link
                  key={item.id}
                  to={stagePath('drafts')}
                  className="block rounded-lg border border-line bg-white/[0.02] p-2.5 transition-colors hover:border-primary/30"
                >
                  <p className="line-clamp-1 text-[11px] font-medium text-text-primary">{item.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <ContentStatusBadge status={item.status} />
                    <span className="text-[9px] text-text-muted">{formatDate(item.scheduledAt, 'd MMM HH:mm')}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Top performing" description="Berdasarkan views" />
          <div className="space-y-3">
            {top.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada konten tayang.</p>
            ) : (
              top.map((item, i) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <span className="num mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03] text-[9px] text-text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[11px] font-medium text-text-primary">{item.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <PlatformChip platform={item.platform} />
                      <span className="num text-[9px] text-text-muted">{formatNumber(item.views, true)} views</span>
                    </div>
                  </div>
                  <Badge tone="outline" className="shrink-0">
                    {item.engagement}%
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="relative flex flex-col overflow-hidden border-0 bg-primary p-5 text-ink">
          <div className="halftone pointer-events-none absolute inset-0 text-black/15" />
          <Sparkles className="pointer-events-none absolute -bottom-5 -right-3 size-28 text-black/10" strokeWidth={1.25} />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">Next best action</p>
          <h3 className="relative mt-2 text-[17px] font-extrabold leading-snug tracking-[-0.02em] text-black">
            {format === 'long'
              ? 'Kunci 1 episode panjang dengan watch time di atas 8 menit.'
              : 'Produksi 3 hook dalam satu sesi batch hari ini.'}
          </h3>
          <p className="relative mt-2 text-[11px] leading-relaxed text-black/65">
            {format === 'long'
              ? `Rata-rata watch time ${formatDepth(format, depth)}. Perkuat 30 detik pertama dan chapter pertama.`
              : `Completion rata-rata ${formatDepth(format, depth)}. Uji hook 3 detik pertama dan teks overlay.`}
          </p>
          <div className="relative mt-auto flex flex-col gap-2 pt-4">
            <Link
              to={stagePath(format === 'long' ? 'scripts' : 'studio')}
              className={cn(buttonVariants({ size: 'sm' }), 'w-full bg-ink text-white hover:bg-ink/90')}
            >
              <Plus /> {format === 'long' ? 'Buka naskah' : 'Buka studio'}
            </Link>
            <Link
              to={stagePath('analytics')}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full text-black/65 hover:bg-black/10 hover:text-black')}
            >
              <CalendarDays /> Lihat analytics
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
