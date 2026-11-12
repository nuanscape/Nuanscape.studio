import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Eye, Plus, TrendingUp, Users } from 'lucide-react'
import { MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ContentFormatBadge, contentFormats, formatBasePath, resolveAccount } from '@/features/content/components/content-flow'
import { ContentStatusBadge, PlatformChip, statusOrder } from '@/features/content/components/content-ui'
import { platformAccounts } from '@/data/mock'
import { useContentStore } from '@/stores/content-store'
import { cn, formatDate, formatNumber, formatPercent } from '@/lib/utils'

export function ContentAccountPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const items = useContentStore((s) => s.items)
  const ideas = useContentStore((s) => s.ideas)
  const account = platformAccounts.find((entry) => entry.id === accountId)

  if (!account) {
    return (
      <div className="rounded-2xl border border-line bg-surface/50 p-8 text-center">
        <p className="text-sm text-text-primary">Akun tidak ditemukan.</p>
        <Link to="/app/content/accounts" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-4')}>
          <ArrowLeft /> Kembali ke daftar akun
        </Link>
      </div>
    )
  }

  const basePath = formatBasePath(account.format)
  const scope = `?account=${account.id}`
  const isLong = account.format === 'long'
  const accountItems = items.filter((item) => resolveAccount(item)?.id === account.id)
  const accountIdeas = ideas.filter((idea) => resolveAccount(idea)?.id === account.id)
  const published = accountItems.filter((item) => item.status === 'Published')
  const views = published.reduce((total, item) => total + item.views, 0)
  const engagement = published.length
    ? published.reduce((total, item) => total + item.engagement, 0) / published.length
    : 0
  const upcoming = [...accountItems]
    .filter((item) => item.status !== 'Published')
    .sort((a, b) => (a.scheduledAt > b.scheduledAt ? 1 : -1))
    .slice(0, 4)
  const pipeline = statusOrder
    .map((status) => ({ status, count: accountItems.filter((item) => item.status === status).length }))
    .filter((entry) => entry.count > 0)

  return (
    <div>
      <div className="mb-5">
        <Link to="/app/content/accounts" className="inline-flex items-center gap-1 text-[10px] text-text-muted transition-colors hover:text-text-primary">
          <ArrowLeft className="size-3" /> Semua akun
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-bold tracking-tight text-white lg:text-[28px]">{account.name}</h1>
              <ContentFormatBadge format={account.format} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
              <PlatformChip platform={account.platform} />
              <span>{account.handle}</span>
              <span>·</span>
              <span>{account.niche}</span>
              <span>·</span>
              <span>{account.followers.toLocaleString('id-ID')} followers</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`${basePath}${scope}`} className={buttonVariants({ variant: 'secondary' })}>
              <ArrowRight /> Buka flow
            </Link>
            <Link to={`${basePath}/studio${scope}`} className={buttonVariants()}>
              <Plus /> Buat konten
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Followers" value={formatNumber(account.followers, true)} delta={account.status === 'Paused' ? 0 : 4.6} deltaLabel={`${account.status} · sync ${formatDate(account.lastSync, 'd MMM HH:mm')}`} icon={<Users />} accent="yellow" />
        <MetricCard label="Views 30 hari" value={formatNumber(account.views30d, true)} delta={9.4} deltaLabel="akun ini" icon={<Eye />} accent={isLong ? 'orange' : 'teal'} />
        <MetricCard
          label={isLong ? 'Avg watch time' : 'Completion rate'}
          value={isLong ? `${account.avgWatchMinutes.toFixed(1)} mnt` : formatPercent(account.completionRate, false)}
          deltaLabel={`${account.posts30d} ${isLong ? 'upload' : 'post'} 30 hari`}
          icon={<TrendingUp />}
          tone="positive"
          accent="pink"
        />
        <MetricCard label="Engagement" value={formatPercent(account.engagement)} deltaLabel={`${published.length} konten tayang`} icon={<CalendarDays />} accent="blue" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Pipeline akun"
            description={`${accountItems.length} item · ${accountIdeas.length} ide`}
            action={
              <Link to={`${basePath}/drafts${scope}`} className="text-[10px] text-primary">
                Kelola produksi
              </Link>
            }
          />
          <div className="space-y-3">
            {pipeline.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada item untuk akun ini.</p>
            ) : (
              pipeline.map((entry) => {
                const pct = accountItems.length ? (entry.count / accountItems.length) * 100 : 0
                return (
                  <div key={entry.status}>
                    <div className="flex items-center justify-between text-[11px]">
                      <ContentStatusBadge status={entry.status} />
                      <span className="num text-text-muted">{entry.count}</span>
                    </div>
                    <Progress value={pct} size="sm" className="mt-1.5" />
                  </div>
                )
              })
            )}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">Jalur kerja {account.format === 'long' ? 'panjang' : 'pendek'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contentFormats[account.format].stages.map((stage) => (
                <Link
                  key={stage.key}
                  to={`${basePath}/${stage.key}${scope}`}
                  className="rounded-full border border-line px-2.5 py-1 text-[10px] text-text-muted transition-colors hover:border-white/15 hover:text-text-primary"
                >
                  {stage.label}
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Jadwal terdekat" description="Konten akun ini" />
          <div className="space-y-2.5">
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada jadwal untuk akun ini.</p>
            ) : (
              upcoming.map((item) => (
                <div key={item.id} className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                  <p className="line-clamp-1 text-[11px] font-medium text-text-primary">{item.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <ContentStatusBadge status={item.status} />
                    <span className="text-[9px] text-text-muted">{formatDate(item.scheduledAt, 'd MMM HH:mm')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-line pt-3 text-[10px] text-text-muted">
            Engagement rata-rata {formatPercent(engagement)} dari {published.length} konten tayang. Views terjaga{' '}
            {formatNumber(views, true)}.
          </div>
          <Link to={`${basePath}${scope}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2 w-full')}>
            Lihat semua stage <ArrowRight />
          </Link>
        </Card>
      </div>
    </div>
  )
}
