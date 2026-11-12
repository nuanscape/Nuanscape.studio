import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Blocks,
  CalendarCheck,
  Film,
  Flame,
  Package,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { cn, formatIDR, formatNumber, formatRelative } from '@/lib/utils'
import { useAppStore, useAuthStore } from '@/stores/app-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useContentStore } from '@/stores/content-store'
import { useSellerStore } from '@/stores/seller-store'
import { financeSummary, contentSummary, shopMetrics, categoryTotals } from '@/lib/metrics'
import { financeSeries, automations } from '@/data/mock'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { AreaTrendChart, Sparkline } from '@/components/charts/charts'
import { quickActions } from '@/components/navigation/nav-config'

export function CommandCenterPage() {
  const { user } = useAuthStore()
  const { notifications } = useAppStore()
  const { transactions, assets, liabilities } = useFinanceStore()
  const { items: contentItems } = useContentStore()
  const { products, fees, orders } = useSellerStore()
    const navigate = useNavigate()
  const [range, setRange] = React.useState<'7d' | '30d' | '12m'>('30d')

  const finance = financeSummary(transactions, assets, liabilities)
  const content = contentSummary(contentItems)
  const shop = shopMetrics(products, fees)
  const expenses = categoryTotals(transactions, 'expense')
  const lowStock = products.filter((p) => p.stock <= p.minStock)
  const readyScripts = contentItems.filter((i) => i.status === 'Script Ready' || i.status === 'Review')
  const unread = notifications.filter((n) => !n.read).slice(0, 3)
  const approvalAutomations = automations.filter((a) => a.status === 'needs_approval')

  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'

  const chartData = range === '12m' ? financeSeries : financeSeries.slice(-6)

  const activities = React.useMemo(() => {
    const items = [
      ...transactions.slice(0, 4).map((t) => ({
        id: t.id,
        icon: t.type === 'income' ? TrendingUp : TrendingDown,
        tone: t.type === 'income' ? 'text-primary' : 'text-danger',
        title: t.description,
        meta: `${t.category} · ${t.account}`,
        time: t.date,
        value: `${t.type === 'income' ? '+' : '-'}${formatIDR(t.amount)}`,
      })),
      ...contentItems
        .filter((i) => i.status === 'Published' || i.status === 'Script Ready')
        .slice(0, 3)
        .map((i) => ({
          id: i.id,
          icon: Film,
          tone: 'text-[#FFE9A3]',
          title: i.title,
          meta: `${i.platform} · ${i.status}`,
          time: i.scheduledAt,
          value: i.status === 'Published' ? `${formatNumber(i.views, true)} views` : 'Script',
        })),
      ...orders.slice(0, 3).map((o) => ({
        id: o.id,
        icon: Package,
        tone: 'text-[#FFD166]',
        title: `${o.customer} · ${o.product}`,
        meta: `${o.marketplace} · ${o.status}`,
        time: o.date,
        value: formatIDR(o.total),
      })),
    ]
    return items
      .sort((a, b) => +new Date(b.time) - +new Date(a.time))
      .slice(0, 7)
  }, [transactions, contentItems, orders])

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[var(--radius-panel)] border border-line bg-gradient-to-br from-card/80 via-card/55 to-background-secondary/40 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/[0.07] blur-[90px]" />
        <div className="pointer-events-none absolute inset-0 dot-overlay opacity-[0.16]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.07] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-primary">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                Nuanscape AI aktif
              </span>
              <span className="text-[10px] text-text-muted">
                {format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeID })}
              </span>
            </div>
            <h1 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.04em] text-text-primary sm:text-[36px]">
              {greeting}, {user.name.split(' ')[0]}.
            </h1>
            <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-text-secondary">
              Workspace kamu terlihat sehat. Ada {lowStock.length} stok kritis, {readyScripts.length} script
              siap direview, dan {approvalAutomations.length} automation menunggu approval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/automations')}>
              <Blocks /> Automations
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Net cash flow', value: formatIDR(finance.net, { compact: true }), icon: Wallet, color: '#F5D64B', note: `${finance.savingsRate.toFixed(1)}% savings rate` },
            { label: 'Konten aktif', value: `${content.inProduction}`, icon: Film, color: '#FFE9A3', note: `${content.published} published` },
            { label: 'Net profit', value: formatIDR(shop.netProfit, { compact: true }), icon: Store, color: '#FFD166', note: `${shop.margin.toFixed(1)}% margin` },
            { label: 'Agent aktif', value: `${4}`, icon: Sparkles, color: '#6DBBFF', note: 'Nuanscape + 3 agent' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-background/30 px-3.5 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <stat.icon className="size-3" style={{ color: stat.color }} />
                <span className="text-[9px] uppercase tracking-[0.1em] text-text-muted">{stat.label}</span>
              </div>
              <p className="num mt-1.5 text-[17px] font-semibold tracking-tight text-text-primary">{stat.value}</p>
              <p className="mt-0.5 text-[9px] text-text-muted">{stat.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <WorkspaceCard
          accent="#F5D64B"
          icon={Wallet}
          label="Finance"
          title="Financial intelligence"
          description="Pahami arus kas, kendalikan budget, dan lihat proyeksi sebelum mengambil keputusan."
          metricLabel="Net cash flow"
          metric={formatIDR(finance.net)}
          delta="+12,4%"
          subMetrics={[
            { label: 'Savings rate', value: `${finance.savingsRate.toFixed(1)}%` },
            { label: 'Total aset', value: formatIDR(finance.assetTotal, { compact: true }) },
          ]}
          href="/app/finance/overview"
          sparkData={financeSeries.map((d) => ({ v: d.net }))}
        />
        <WorkspaceCard
          accent="#FFE9A3"
          icon={Film}
          label="Content Studio"
          title="Research to publish"
          description="Riset tren, ciptakan ide dan script, lalu kelola pipeline lintas YouTube, TikTok, dan Instagram."
          metricLabel="Total views"
          metric={formatNumber(content.views, true)}
          delta="+18,4%"
          subMetrics={[
            { label: 'Published', value: `${content.published} item` },
            { label: 'In production', value: `${content.inProduction} item` },
          ]}
          href="/app/content/overview"
          sparkData={financeSeries.slice(-8).map((d, i) => ({ v: d.net / 2 + i * 320000 }))}
        />
        <WorkspaceCard
          accent="#FFD166"
          icon={Store}
          label="Seller Center"
          title="Marketplace command"
          description="Satu pandangan untuk TikTok Seller dan Shopee: stok, margin, fee, dan profit bersih."
          metricLabel="Net profit 30 hari"
          metric={formatIDR(shop.netProfit)}
          delta={`${shop.margin.toFixed(1)}%`}
          subMetrics={[
            { label: 'Inventory value', value: formatIDR(shop.inventoryValue, { compact: true }) },
            { label: 'Stok kritis', value: `${lowStock.length} produk` },
          ]}
          href="/app/seller/overview"
          sparkData={financeSeries.slice(-8).map((d, i) => ({ v: d.income / 3 + i * 210000 }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-text-primary">Today's overview</h2>
                <p className="mt-0.5 text-[11px] text-text-muted">Ringkasan performa dan item yang perlu perhatian.</p>
              </div>
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { label: '7 hari', value: '7d' },
                  { label: '30 hari', value: '30d' },
                  { label: '12 bulan', value: '12m' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.25fr_1fr]">
              <div className="border-b border-line p-5 md:border-b-0 md:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Income vs expense</p>
                    <p className="num mt-1 text-xl font-semibold text-text-primary">
                      {formatIDR(finance.net)}
                      <span className="ml-2 text-[11px] font-normal text-primary">net</span>
                    </p>
                  </div>
                  <Badge tone="primary"><TrendingUp /> 12,4%</Badge>
                </div>
                <AreaTrendChart
                  data={chartData.map((d) => ({ label: d.label, income: d.income, expense: d.expense }))}
                  xKey="label"
                  series={[
                    { key: 'income', label: 'Income', color: '#F5D64B' },
                    { key: 'expense', label: 'Expense', color: '#F0512B' },
                  ]}
                  height={190}
                />
              </div>
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Top expense categories</p>
                <div className="mt-3 space-y-3">
                  {expenses.slice(0, 4).map((category) => {
                    const total = expenses.reduce((a, c) => a + c.value, 0)
                    const share = (category.value / total) * 100
                    return (
                      <div key={category.name}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-secondary">{category.name}</span>
                          <span className="num text-text-primary">{formatIDR(category.value, { compact: true })}</span>
                        </div>
                        <Progress value={share} size="sm" className="mt-1.5" tone={share > 30 ? 'warning' : 'primary'} />
                      </div>
                    )
                  })}
                </div>
                <Link to="/app/finance/overview" className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-soft">
                  Lihat finance <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-[13px] font-semibold text-text-primary">Recent activity</h2>
              <span className="text-[10px] text-text-muted">Lintas workspace</span>
            </div>
            <div className="divide-y divide-line/70">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.02]', activity.tone)}>
                    <activity.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-text-primary">{activity.title}</p>
                    <p className="truncate text-[10px] text-text-muted">{activity.meta}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-[11px] text-text-secondary">{activity.value}</p>
                    <p className="text-[9px] text-text-muted">{formatRelative(activity.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-card/60 to-card/30 p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-text-primary">AI briefing</p>
                  <p className="text-[9px] text-text-muted">Konteks: Command Center · data hari ini</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { icon: TrendingDown, text: 'Pengeluaran naik 12% bulan ini, terutama HPP produk.', tone: 'text-warning' },
                  { icon: Flame, text: `2 produk di bawah minimum stok — prioritas restock.`, tone: 'text-danger' },
                  { icon: CalendarCheck, text: `${readyScripts.length} script siap direview untuk slot publish minggu ini.`, tone: 'text-primary' },
                ].map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <insight.icon className={cn('mt-0.5 size-3.5 shrink-0', insight.tone)} />
                    <p className="text-[11px] leading-relaxed text-text-secondary">{insight.text}</p>
                  </div>
                ))}
              </div>
              <Link to="/app/monitor" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-[#0B0B0B]">
                Buka Agent Monitor <ArrowRight className="size-4" />
              </Link>
              <p className="mt-2 text-center text-[9px] text-text-muted">
                Setiap insight menyertakan alasan & sumber data.
              </p>
            </div>
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[12px] font-semibold text-text-primary">
                <Bell className="size-3.5 text-text-muted" /> Notifications
              </h2>
              <Link to="/app/notifications" className="text-[10px] text-primary hover:text-primary-soft">Semua</Link>
            </div>
            <div className="divide-y divide-line/70">
              {unread.length === 0 ? (
                <p className="px-4 py-6 text-center text-[11px] text-text-muted">Tidak ada notifikasi baru.</p>
              ) : (
                unread.map((n) => (
                  <Link key={n.id} to={n.href ?? '/app/notifications'} className="block px-4 py-3 transition-colors hover:bg-white/[0.02]">
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-text-primary">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-text-muted">{n.message}</p>
                        <p className="mt-1 text-[9px] text-text-muted/70">{formatRelative(n.time)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[12px] font-semibold text-text-primary">Quick actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line/60">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="group flex items-center gap-2 bg-card/80 px-5 py-4 text-[11px] text-text-secondary transition-colors hover:bg-card-secondary hover:text-text-primary"
                >
                  <action.icon className="size-3.5 text-primary" />
                  <span className="flex-1">{action.label}</span>
                  <ArrowUpRight className="size-3 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function WorkspaceCard({
  accent,
  icon: Icon,
  label,
  title,
  description,
  metricLabel,
  metric,
  delta,
  subMetrics,
  href,
  sparkData,
}: {
  accent: string
  icon: React.ElementType
  label: string
  title: string
  description: string
  metricLabel: string
  metric: string
  delta: string
  subMetrics: { label: string; value: string }[]
  href: string
  sparkData: Array<{ v: number }>
}) {
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-[var(--radius-panel)] border border-line bg-card/55 p-5 card-hover"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full blur-[70px] opacity-60 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: `${accent}18` }}
      />
      <div className="relative flex items-start justify-between">
        <span
          className="grid size-10 place-items-center rounded-xl border"
          style={{ borderColor: `${accent}30`, backgroundColor: `${accent}0d`, color: accent }}
        >
          <Icon className="size-5" />
        </span>
        <span
          className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium"
          style={{ borderColor: `${accent}25`, backgroundColor: `${accent}0d`, color: accent }}
        >
          <Zap className="size-2.5" /> {delta}
        </span>
      </div>
      <div className="relative mt-4">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-text-muted">{label}</p>
        <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-text-primary">{title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-text-muted">{description}</p>
      </div>
      <div className="relative mt-4 rounded-xl border border-line bg-background/25 p-3">
        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">{metricLabel}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="num mt-0.5 text-[20px] font-semibold tracking-tight text-text-primary">{metric}</p>
          <Sparkline data={sparkData} dataKey="v" color={accent} height={30} className="w-20" />
        </div>
      </div>
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        {subMetrics.map((m) => (
          <div key={m.label}>
            <p className="text-[9px] text-text-muted">{m.label}</p>
            <p className="num mt-0.5 text-[11px] text-text-secondary">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-4 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary transition-colors group-hover:text-primary">
        Buka workspace <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
