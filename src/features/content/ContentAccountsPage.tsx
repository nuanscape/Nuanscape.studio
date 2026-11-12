import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Eye, Layers, TrendingUp, Users } from 'lucide-react'
import { PageHeader, MetricCard } from '@/components/shared/page-header'
import { ContentFormatBadge } from '@/features/content/components/content-flow'
import { PlatformChip } from '@/features/content/components/content-ui'
import { platformAccounts } from '@/data/mock'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import type { ContentFormat, PlatformAccount } from '@/types'

const statusTone: Record<PlatformAccount['status'], string> = {
  Active: '#24C7C4',
  Growing: '#F5D64B',
  Paused: '#62798A',
}

const formatOrder: ContentFormat[] = ['long', 'short']

function depthLabel(account: PlatformAccount) {
  return account.format === 'long' ? `${account.avgWatchMinutes.toFixed(1)} mnt watch` : `${formatPercent(account.completionRate, false)} completion`
}

export function ContentAccountsPage() {
  const totalFollowers = platformAccounts.reduce((total, account) => total + account.followers, 0)
  const totalViews = platformAccounts.reduce((total, account) => total + account.views30d, 0)
  const totalPosts = platformAccounts.reduce((total, account) => total + account.posts30d, 0)
  const weightedEngagement = totalViews
    ? platformAccounts.reduce((total, account) => total + account.engagement * account.views30d, 0) / totalViews
    : 0

  return (
    <div>
      <PageHeader
        title="Akun konten"
        description="Semua akun dipisah per flow: long-form untuk YouTube, short-form untuk TikTok dan Instagram. Flow tidak pernah dicampur."
        actions={
          <Link
            to="/app/content/overview"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] text-text-secondary transition-colors hover:border-white/15 hover:text-text-primary"
          >
            <Layers /> Overview
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total akun" value={`${platformAccounts.length} akun`} deltaLabel="6 platform handle" icon={<Users />} accent="yellow" />
        <MetricCard label="Total followers" value={formatNumber(totalFollowers, true)} delta={6.2} deltaLabel="30 hari terakhir" icon={<TrendingUp />} tone="positive" accent="teal" />
        <MetricCard label="Views 30 hari" value={formatNumber(totalViews, true)} delta={14.8} deltaLabel="gabungan semua akun" icon={<Eye />} accent="orange" />
        <MetricCard label="Konten 30 hari" value={`${totalPosts} post`} deltaLabel={`engagement ${formatPercent(weightedEngagement)}`} icon={<ArrowUpRight />} accent="pink" />
      </div>

      <div className="mt-6 space-y-6">
        {formatOrder.map((format) => {
          const accounts = platformAccounts.filter((account) => account.format === format)
          return (
            <section key={format}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ContentFormatBadge format={format} />
                  <h2 className="text-[15px] font-bold tracking-[-0.02em] text-white">
                    {format === 'long' ? 'Long-form · YouTube' : 'Short-form · TikTok & Instagram'}
                  </h2>
                </div>
                <Link
                  to={format === 'long' ? '/app/content/long-form' : '/app/content/short-form'}
                  className="inline-flex items-center gap-1 text-[10px] text-primary"
                >
                  Buka flow <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => (
                  <Link
                    key={account.id}
                    to={`/app/content/accounts/${account.id}`}
                    className="group rounded-2xl border border-line bg-surface/50 p-4 transition-colors hover:border-white/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-text-primary">{account.name}</p>
                        <p className="mt-0.5 text-[10px] text-text-muted">{account.handle}</p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
                        style={{ color: statusTone[account.status], backgroundColor: `${statusTone[account.status]}18` }}
                      >
                        {account.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <PlatformChip platform={account.platform} />
                      <span className="text-[9px] text-text-muted">· {account.niche}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-line bg-white/[0.02] p-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Followers</p>
                        <p className="num mt-0.5 text-[12px] font-medium text-text-primary">{formatNumber(account.followers, true)}</p>
                      </div>
                      <div className="rounded-lg border border-line bg-white/[0.02] p-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Views 30h</p>
                        <p className="num mt-0.5 text-[12px] font-medium text-text-primary">{formatNumber(account.views30d, true)}</p>
                      </div>
                      <div className="rounded-lg border border-line bg-white/[0.02] p-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Post 30h</p>
                        <p className="num mt-0.5 text-[12px] font-medium text-text-primary">{account.posts30d}</p>
                      </div>
                      <div className="rounded-lg border border-line bg-white/[0.02] p-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Engagement</p>
                        <p className="num mt-0.5 text-[12px] font-medium text-text-primary">{formatPercent(account.engagement)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className={cn('text-[10px]', account.format === 'long' ? 'text-orange' : 'text-teal')}>
                        {depthLabel(account)}
                      </span>
                      <ArrowRight className="size-3.5 text-text-muted transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
