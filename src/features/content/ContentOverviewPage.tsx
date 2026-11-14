import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { AreaTrendChart, BarTrendChart } from '@/components/charts/charts'
import { PlatformLogo, platformColor } from '@/features/content/components/content-ui'
import { contentAnalytics, platformAccounts } from '@/data/mock'
import { formatIDR, formatNumber, formatPercent } from '@/lib/utils'
import type { Platform } from '@/types'

const platforms: Platform[] = ['YouTube', 'TikTok', 'Instagram']
const earningsRate: Record<Platform, number> = { YouTube: 8, TikTok: 3, Instagram: 4 }

function aggregate(platform: Platform) {
  const accounts = platformAccounts.filter((a) => a.platform === platform)
  const followers = accounts.reduce((t, a) => t + a.followers, 0)
  const views = accounts.reduce((t, a) => t + a.views30d, 0)
  const posts = accounts.reduce((t, a) => t + a.posts30d, 0)
  const engagement = views ? accounts.reduce((t, a) => t + a.engagement * a.views30d, 0) / views : 0
  return { followers, views, posts, engagement }
}

export function ContentOverviewPage() {
  const stats = platforms.map((p) => ({ platform: p, ...aggregate(p) }))
  const totalViews = stats.reduce((t, s) => t + s.views, 0)

  const trendData = contentAnalytics.map((d) => {
    const share = (p: Platform) => (stats.find((s) => s.platform === p)?.views ?? 0) / (totalViews || 1)
    return {
      label: d.label,
      YouTube: Math.round(d.views * share('YouTube')),
      TikTok: Math.round(d.views * share('TikTok')),
      Instagram: Math.round(d.views * share('Instagram')),
    }
  })

  const compareData = stats.map((s) => ({
    name: s.platform,
    views: s.views,
    followers: s.followers,
  }))

  const earnings = stats.map((s) => ({
    platform: s.platform,
    value: Math.round(s.views * earningsRate[s.platform]),
  }))
  const totalEarnings = earnings.reduce((t, e) => t + e.value, 0)

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Performa 3 platform: YouTube, Instagram, dan TikTok."
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4 border-primary/30 bg-primary/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">Penghasilan Semua</p>
          <p className="num mt-2 text-[22px] font-semibold text-white">{formatIDR(totalEarnings, { compact: true })}</p>
          <p className="mt-1 text-[10px] text-text-muted">Estimasi 30 hari · 3 platform</p>
        </Card>
        {earnings.map((e) => (
          <Card key={e.platform} className="p-4" style={{ borderColor: `${platformColor[e.platform]}44` }}>
            <div className="flex items-center gap-2">
              <span style={{ color: platformColor[e.platform] }} className="inline-flex">
                <PlatformLogo platform={e.platform} className="size-3.5" />
              </span>
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">Penghasilan {e.platform}</p>
            </div>
            <p className="num mt-2 text-[22px] font-semibold text-white">{formatIDR(e.value, { compact: true })}</p>
            <p className="mt-1 text-[10px] text-text-muted">Estimasi 30 hari</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Tren views 7 hari" description="Views harian per platform" />
          <AreaTrendChart
            data={trendData}
            xKey="label"
            series={platforms.map((p) => ({ key: p, label: p, color: platformColor[p] }))}
            height={280}
            valueFormatter={(v) => formatNumber(v)}
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Perbandingan views 30 hari" description="Total views per platform" />
          <BarTrendChart
            data={compareData}
            xKey="name"
            series={[{ key: 'views', label: 'Views', color: '#F5D64B' }]}
            height={280}
            valueFormatter={(v) => formatNumber(v)}
          />
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Ringkasan performa" description="Metrik utama per platform" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.1em] text-text-muted">
                <th className="px-3 py-2.5 font-medium">Platform</th>
                <th className="px-3 py-2.5 font-medium text-right">Views 30h</th>
                <th className="px-3 py-2.5 font-medium text-right">Followers</th>
                <th className="px-3 py-2.5 font-medium text-right">Post 30h</th>
                <th className="px-3 py-2.5 font-medium text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.platform} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 text-[12px] font-medium text-text-primary">
                      <span style={{ color: platformColor[s.platform] }} className="inline-flex">
                        <PlatformLogo platform={s.platform} className="size-3.5" />
                      </span>
                      {s.platform}
                    </span>
                  </td>
                  <td className="num px-3 py-3 text-right text-[12px] text-text-primary">{formatNumber(s.views, true)}</td>
                  <td className="num px-3 py-3 text-right text-[12px] text-text-secondary">{formatNumber(s.followers, true)}</td>
                  <td className="num px-3 py-3 text-right text-[12px] text-text-secondary">{s.posts}</td>
                  <td className="num px-3 py-3 text-right text-[12px]" style={{ color: platformColor[s.platform] }}>{formatPercent(s.engagement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
