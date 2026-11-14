import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  Lightbulb,
  Package,
  Play,
  ShieldCheck,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { PageHeader, SectionHeader, MetricCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { shopInsights, marketplaces } from '@/data/mock'
import { useAutomationStore } from '@/stores/automation-store'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { agentProfiles } from '@/features/monitor/components/agents'
import { MarketplaceBadge } from '@/features/seller/components/seller-ui'
import { formatDate, formatIDR } from '@/lib/utils'
import { shopMetrics } from '@/lib/metrics'

export function SellerAgentReportPage() {
  const products = useSellerStore((s) => s.products)
  const orders = useSellerStore((s) => s.orders)
  const movements = useSellerStore((s) => s.movements)
  const connections = useSellerStore((s) => s.connections)
  const fees = useSellerStore((s) => s.fees)
  const { push } = useToastStore()

  const automations = useAutomationStore((s) => s.items)
  const approve = useAutomationStore((s) => s.approve)

  const ucup = agentProfiles.ucup
  const metrics = shopMetrics(products, fees)

  const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Processing')
  const shippedOrders = orders.filter((o) => o.status === 'Shipped')
  const completedOrders = orders.filter((o) => o.status === 'Completed')
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const outOfStock = products.filter((p) => p.stock === 0)
  const activeProducts = products.filter((p) => p.status === 'Active')
  const connectedStores = connections.filter((c) => c.status === 'connected')
  const shopAutomations = automations.filter((a) => a.module === 'Shop')
  const approvals = shopAutomations.filter((a) => a.status === 'needs_approval')

  const recentOrders = [...orders].sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const recentMovements = [...movements].sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const latestOrder = recentOrders[0]
  const latestRestock = recentMovements.find((m) => m.type === 'in')
  const lastSync = connections
    .map((c) => c.lastSync)
    .sort((a, b) => +new Date(b) - +new Date(a))[0]

  const activities = [
    latestOrder
      ? {
          id: 'order',
          title: `Pesanan ${latestOrder.id} masuk`,
          detail: `${latestOrder.customer} · ${latestOrder.product} · ${formatIDR(latestOrder.total, { compact: true })}`,
          time: formatDate(latestOrder.date, 'd MMM, HH:mm'),
        }
      : null,
    {
      id: 'sync',
      title: 'Sinkronisasi marketplace selesai',
      detail: `${connectedStores.length} toko terhubung · ${connectedStores.map((c) => c.storeName).join(' & ')}`,
      time: lastSync ? formatDate(lastSync, 'd MMM, HH:mm') : '—',
    },
    outOfStock.length
      ? {
          id: 'stock-out',
          title: `${outOfStock.length} produk kehabisan stok`,
          detail: outOfStock.map((p) => p.name).join(', '),
          time: 'Perlu tindakan',
        }
      : null,
    latestRestock
      ? {
          id: 'restock',
          title: 'Restock inventori tercatat',
          detail: `${latestRestock.note} · ${latestRestock.qty} unit`,
          time: formatDate(latestRestock.date, 'd MMM, HH:mm'),
        }
      : null,
    lowStock.length
      ? {
          id: 'stock-low',
          title: `${lowStock.length} produk di bawah stok minimum`,
          detail: lowStock.map((p) => `${p.name} (${p.stock})`).join(', '),
          time: 'Pantau restock',
        }
      : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null)

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const ordersThisWeek = orders.filter((o) => new Date(o.date) >= startOfWeek).length
  const restocksThisWeek = movements.filter((m) => m.type === 'in' && new Date(m.date) >= startOfWeek).length
  const unitsOutThisWeek = movements
    .filter((m) => m.type === 'out' && new Date(m.date) >= startOfWeek)
    .reduce((a, m) => a + m.qty, 0)

  const month = today.getMonth()
  const year = today.getFullYear()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay.getDay()
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const orderByDay = new Map<string, number>()
  const stockByDay = new Map<string, number>()
  orders.forEach((o) => {
    const k = dayKey(new Date(o.date))
    orderByDay.set(k, (orderByDay.get(k) || 0) + 1)
  })
  movements.forEach((m) => {
    const k = dayKey(new Date(m.date))
    stockByDay.set(k, (stockByDay.get(k) || 0) + 1)
  })
  const calendarCells = Array.from({ length: offset + daysInMonth }, (_, idx) => {
    if (idx < offset) return null
    const day = idx - offset + 1
    const date = new Date(year, month, day)
    const k = dayKey(date)
    return {
      day,
      order: orderByDay.get(k) || 0,
      stock: stockByDay.get(k) || 0,
      isToday: dayKey(date) === dayKey(today),
    }
  })

  return (
    <div>
      <PageHeader
        title="Agent Report"
        description="Laporan Ucup, agent seller center: kinerja marketplace, inventori, command & approval, serta rekomendasi."
      />

      <div className="grid grid-cols-1 gap-4">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.05]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <img
                src={ucup.photo}
                alt={`Avatar ${ucup.name}, ${ucup.role}`}
                className="size-20 rounded-full bg-[#262626] object-cover"
                style={{ boxShadow: `0 0 0 3px #0b0b0b, 0 0 0 4px ${ucup.accent}66` }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-card bg-teal" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">{ucup.name}</h2>
                    <Badge tone="success">Aktif</Badge>
                    <Badge tone="info">{ucup.role}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">{ucup.duty}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-text-muted">Fokus</span>
                  <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-text-secondary">Sinkron order</span>
                  <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-text-secondary">Inventori</span>
                  <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-text-secondary">Profit & SEO</span>
                </div>
              </div>

              <p className="mt-4 max-w-4xl text-[12px] leading-relaxed text-white/65">
                {activeProducts.length} produk aktif, {pendingOrders.length} pesanan menunggu diproses, dan{' '}
                {lowStock.length + outOfStock.length} produk butuh perhatian stok. Sinkronisasi berjalan di{' '}
                {connectedStores.length} dari {connections.length} akun marketplace.
              </p>

              <div className="mt-4 rounded-xl border border-line bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">Akun tersinkron</span>
                  <span className="text-[10px] text-text-muted">
                    {connectedStores.length}/{connections.length} aktif
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {connectedStores.map((c) => (
                    <div
                      key={c.id}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-2"
                    >
                      <MarketplaceBadge marketplace={c.name} />
                      <span className="truncate text-[11px] text-text-secondary">{c.storeName}</span>
                      <CheckCircle2 className="ml-auto size-3.5 shrink-0 text-teal" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue 30 hari"
          value={formatIDR(metrics.netSales, { compact: true })}
          deltaLabel={`${metrics.orders} order tersinkron`}
          icon={<Wallet />}
          accent="orange"
          tone="positive"
        />
        <MetricCard
          label="Net profit"
          value={formatIDR(metrics.netProfit, { compact: true })}
          deltaLabel={`margin ${metrics.margin.toFixed(1)}%`}
          icon={<TrendingUp />}
          accent="teal"
        />
        <MetricCard
          label="Perlu diproses"
          value={`${pendingOrders.length}`}
          deltaLabel={`${shippedOrders.length} dikirim`}
          icon={<Package />}
          accent="yellow"
          tone="warning"
        />
        <MetricCard
          label="Stok kritis"
          value={`${lowStock.length + outOfStock.length}`}
          deltaLabel={`${outOfStock.length} habis · ${lowStock.length} rendah`}
          icon={<AlertTriangle />}
          accent="pink"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Kinerja & aktivitas Ucup" description="Aktivitas terbaru seller center agent" />
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-xl border border-line bg-white/[0.02] p-3">
                <img
                  src={ucup.photo}
                  alt={`Avatar ${ucup.name}`}
                  className="mt-0.5 size-8 shrink-0 rounded-lg bg-[#262626] object-cover"
                  style={{ boxShadow: `0 0 0 1px ${ucup.accent}33` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-medium text-text-primary">{a.title}</p>
                    <Badge tone="outline" className="text-[9px]">{a.time}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-muted">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Command & approval" description="Otomatisasi seller yang berjalan dan menunggu persetujuan" />
          <div className="space-y-2">
            {shopAutomations.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-3 ${
                  a.status === 'needs_approval'
                    ? 'border-yellow/[0.18] bg-yellow/[0.04]'
                    : 'border-line bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-semibold text-text-primary">{a.name}</p>
                  <Badge tone={a.status === 'needs_approval' ? 'warning' : a.status === 'active' ? 'success' : 'outline'}>
                    {a.status === 'needs_approval' ? 'Perlu approval' : a.status === 'active' ? 'Aktif' : 'Paused'}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">{a.description}</p>
                <p className="mt-1.5 text-[10px] text-text-muted">Trigger: {a.trigger} · Runs: {a.runs}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  Terakhir: {formatDate(a.lastRun, 'd MMM, HH:mm')} · Success {a.successRate}%
                </p>
                {a.status === 'needs_approval' ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        approve(a.id)
                        push({ title: 'Disetujui & berjalan', description: `${a.name} otomatis aktif kembali.`, tone: 'success' })
                      }}
                    >
                      <Play className="size-3.5" /> Setujui & jalankan
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {!approvals.length ? (
              <div className="flex items-center gap-2 rounded-xl border border-teal/[0.18] bg-teal/[0.04] p-3 text-[11px] text-teal">
                <ShieldCheck className="size-4" /> Tidak ada command/approval tertunda.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader
          title="Kalender aktivitas Ucup"
          description={`Order & pergerakan stok bulan ini · ${ordersThisWeek} order, ${restocksThisWeek} restock minggu ini`}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] text-text-muted">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((c, i) => c ? (
                <div
                  key={i}
                  className={`min-h-[56px] rounded-lg border p-1.5 ${c.isToday ? 'border-primary/50 bg-primary/[0.06]' : 'border-line bg-white/[0.02]'}`}
                >
                  <div className="text-[10px] text-text-secondary">{c.day}</div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {c.order > 0 ? (
                      <span className="inline-flex w-fit rounded bg-primary/15 px-1 text-[9px] text-primary">Order {c.order}</span>
                    ) : null}
                    {c.stock > 0 ? (
                      <span className="inline-flex w-fit rounded bg-teal/15 px-1 text-[9px] text-teal">Stok {c.stock}</span>
                    ) : null}
                  </div>
                </div>
              ) : <div key={i} />)}
            </div>
          </div>
          <div className="min-w-[220px] space-y-3 rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-text-primary">
              <CalendarDays className="size-4 text-primary" /> Ringkasan minggu ini
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Order masuk</span>
                <span className="num font-semibold text-primary">{ordersThisWeek}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Restock</span>
                <span className="num font-semibold text-teal">{restocksThisWeek}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Unit keluar</span>
                <span className="num text-text-primary">{unitsOutThisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total order</span>
                <span className="num text-text-primary">{orders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Selesai</span>
                <span className="num text-text-primary">{completedOrders.length}</span>
              </div>
            </div>
            <div className="border-t border-line pt-2 text-[10px] text-text-muted">
              <p className="mb-1 font-medium text-text-secondary">Produk terlaris:</p>
              <div className="max-h-28 space-y-0.5 overflow-auto">
                {[...products]
                  .sort((a, b) => b.sold - a.sold)
                  .slice(0, 6)
                  .map((p) => (
                    <div key={p.id} className="flex justify-between gap-2">
                      <span className="truncate">{p.name}</span>
                      <span className="num text-text-secondary">{p.sold}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Performa marketplace" description="Revenue 30 hari berdasarkan order tersinkron" />
          <div className="space-y-2">
            {marketplaces.map((m) => {
              const accounts = connections.filter((c) => c.name === m.name)
              const linked = accounts.filter((c) => c.status === 'connected').length
              const platformSync = accounts
                .map((a) => a.lastSync)
                .sort((a, b) => +new Date(b) - +new Date(a))[0]
              return (
                <div key={m.name} className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <p className="text-[12px] font-medium text-text-primary">{m.name}</p>
                    </div>
                    <Badge tone={m.name === 'TikTok Shop' ? 'primary' : 'warning'}>
                      {linked}/{accounts.length} akun
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <p className="text-text-muted">Revenue</p>
                      <p className="num font-semibold text-text-primary">{formatIDR(m.revenue, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Order</p>
                      <p className="num font-semibold text-text-primary">{m.orders}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[9px] text-text-muted">
                    Sync terakhir: {platformSync ? formatDate(platformSync, 'd MMM, HH:mm') : '—'}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Saran dari Ucup" description="Rekomendasi untuk meningkatkan performa seller center" />
          <div className="grid grid-cols-1 gap-3">
            {shopInsights.map((insight) => (
              <div key={insight.id} className="rounded-xl border border-line bg-white/[0.02] p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[12px] font-semibold text-text-primary">{insight.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{insight.detail}</p>
                    <p className="mt-2 text-[10px] text-text-muted">Alasan: {insight.why}</p>
                    {insight.action ? <Badge tone="info" className="mt-2 text-[9px]">{insight.action}</Badge> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Kesehatan inventori" description="Produk aktif, stok rendah, dan produk habis" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <CheckCircle2 className="size-4 text-teal" /> Produk aktif
            </div>
            <p className="num mt-1 text-[20px] font-semibold text-text-primary">{activeProducts.length}</p>
            <p className="text-[10px] text-text-muted">dari {products.length} SKU</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <AlertTriangle className="size-4 text-yellow" /> Stok rendah
            </div>
            <p className="num mt-1 text-[20px] font-semibold text-text-primary">{lowStock.length}</p>
            <p className="text-[10px] text-text-muted">{lowStock.map((p) => p.name).join(', ') || 'Tidak ada'}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <Bot className="size-4 text-danger" /> Stok habis
            </div>
            <p className="num mt-1 text-[20px] font-semibold text-text-primary">{outOfStock.length}</p>
            <p className="text-[10px] text-text-muted">{outOfStock.map((p) => p.name).join(', ') || 'Tidak ada'}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
