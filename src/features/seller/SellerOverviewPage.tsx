import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader, InsightCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DonutChart, BarTrendChart } from '@/components/charts/charts'
import { useSellerStore } from '@/stores/seller-store'
import { useAppStore, useToastStore } from '@/stores/app-store'
import { shopMetrics, profitWaterfall } from '@/lib/metrics'
import { marketplaces, shopInsights, shopSeries } from '@/data/mock'
import { cn, formatDate, formatIDR, formatPercent } from '@/lib/utils'
import { MarketplaceBadge, OrderStatusBadge, StockBar } from '@/features/seller/components/seller-ui'

export function SellerOverviewPage() {
  const { products, orders, fees, restockProduct } = useSellerStore()
    const { push } = useToastStore()
  const metrics = shopMetrics(products, fees)
  const waterfall = profitWaterfall(products, fees)
  const maxAbs = Math.max(...waterfall.map((w) => Math.abs(w.value)))
  const recent = [...orders].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)

  const restock = (id: string, name: string, qty: number) => {
    restockProduct(id, qty)
    push({ title: 'Restock dicatat', description: `${qty} unit ${name} ditambahkan.`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Seller overview"
        description="Pantau revenue, profit, stok, dan pesanan lintas marketplace dalam satu dashboard."
        actions={
          <>
            <Link to="/app/seller/marketplaces" className={buttonVariants({ variant: 'secondary' })}>
              <ShoppingBag /> Marketplaces
            </Link>
            <Link to="/app/seller/finance" className={buttonVariants()}>
              <Wallet /> Profit breakdown
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross revenue 30D" value={formatIDR(metrics.grossRevenue)} delta={14.8} deltaLabel="vs 30 hari lalu" icon={<TrendingUp />} accent="orange" />
        <MetricCard label="Net profit" value={formatIDR(Math.round(metrics.netProfit))} delta={6.4} deltaLabel={`${formatPercent(metrics.margin)} margin`} icon={<Wallet />} tone="positive" accent="yellow" />
        <MetricCard label="Pesanan" value={`${metrics.orders} order`} delta={9.2} deltaLabel={`AOV ${formatIDR(metrics.aov, { compact: true })}`} icon={<Package />} accent="teal" />
        <MetricCard label="Inventory value" value={formatIDR(metrics.inventoryValue)} deltaLabel={`${metrics.inventoryUnits} unit`} icon={<Boxes />} tone={metrics.lowStock.length ? 'warning' : 'default'} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Revenue by marketplace"
            description="7 hari terakhir"
            action={<Badge tone="primary"><TrendingUp /> 14,8%</Badge>}
          />
          <BarTrendChart
            data={shopSeries}
            xKey="label"
            stacked
            series={[
              { key: 'tiktok', label: 'TikTok Shop', color: '#F5D64B' },
              { key: 'shopee', label: 'Shopee', color: '#FFD166' },
            ]}
            height={250}
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Marketplace mix" description="Porsi revenue 30 hari" />
          <DonutChart
            data={marketplaces.map((m) => ({ name: m.name, value: m.share, color: m.color }))}
            height={170}
            centerValue={formatIDR(metrics.netSales, { compact: true })}
            centerLabel="net sales"
          />
          <div className="mt-3 space-y-2">
            {marketplaces.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="flex-1 text-text-secondary">{m.name}</span>
                <span className="text-text-muted">{m.orders} order</span>
                <span className="num text-text-primary">{formatIDR(m.revenue, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card className="p-5">
          <SectionHeader title="Profit waterfall" description="Dari gross revenue ke net profit" action={<Link to="/app/seller/finance" className="text-[10px] text-primary">Detail</Link>} />
          <div className="space-y-1.5">
            {waterfall.map((w) => (
              <div key={w.name} className="flex items-center gap-2">
                <span className="w-[92px] shrink-0 text-[10px] text-text-muted">{w.name}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-white/[0.03]">
                  <div
                    className={cn(
                      'h-full rounded',
                      w.type === 'total' ? 'bg-primary/70' : 'bg-danger/45',
                    )}
                    style={{ width: `${(Math.abs(w.value) / maxAbs) * 100}%` }}
                  />
                </div>
                <span className={cn('num w-20 text-right text-[10px]', w.type === 'total' ? 'text-primary' : 'text-text-secondary')}>
                  {w.value < 0 ? '-' : ''}{formatIDR(Math.abs(w.value), { compact: true })}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
            Fee memakai konfigurasi {fees.marketplacePct}% marketplace + {fees.affiliatePct}% afiliasi.
            Ubah di halaman Finance untuk melihat dampak.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionHeader title="Pesanan terbaru" description="6 transaksi terakhir" className="mb-0" />
            <Link to="/app/seller/orders" className="text-[10px] text-primary">Semua pesanan</Link>
          </div>
          <div className="divide-y divide-line">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[11px] font-medium text-text-primary">{o.product}</p>
                    <MarketplaceBadge marketplace={o.marketplace} />
                  </div>
                  <p className="text-[9px] text-text-muted">{o.customer} · {formatDate(o.date, 'd MMM HH:mm')}</p>
                </div>
                <OrderStatusBadge status={o.status} />
                <p className="num w-20 text-right text-[11px] text-text-primary">{formatIDR(o.total, { compact: true })}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <SectionHeader
            title="Stok kritis"
            description={`${metrics.lowStock.length + metrics.outOfStock.length} produk perlu perhatian`}
            action={<Link to="/app/seller/inventory" className="text-[10px] text-primary">Inventory</Link>}
          />
          <div className="space-y-2.5">
            {[...metrics.outOfStock, ...metrics.lowStock].slice(0, 5).map((p) => (
              <div key={p.id} className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-text-primary">{p.name}</p>
                    <p className="text-[9px] text-text-muted">{p.sku} · min {p.minStock} unit</p>
                  </div>
                  <Badge tone={p.stock === 0 ? 'danger' : 'warning'}>{p.stock} unit</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StockBar product={p} />
                  <Button size="sm" variant="soft" className="h-6 px-2 text-[9px]" onClick={() => restock(p.id, p.name, Math.max(p.minStock * 2, 20))}>
                    Restock
                  </Button>
                </div>
              </div>
            ))}
            {metrics.lowStock.length + metrics.outOfStock.length === 0 ? (
              <p className="text-[11px] text-text-muted">Semua stok aman.</p>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="AI shop intelligence"
            description="Menghubungkan produk, fee, stok, dan permintaan"
            action={<button onClick={() => window.location.assign('/app/monitor')} className="text-[10px] text-primary">Tanya Nuanscape AI</button>}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shopInsights.slice(0, 4).map((insight) => (
              <InsightCard key={insight.id} {...insight} onAction={() => window.location.assign('/app/monitor')} />
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/[0.04] p-2.5">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <p className="text-[10px] leading-relaxed text-text-muted">
              Estimasi kehilangan penjualan dihitung dari rata-rata penjualan harian × harga. Bukan
              angka pasti dan tidak memperhitungkan musim.
            </p>
          </div>
        </Card>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[var(--radius-card)] bg-primary px-4 py-4 text-ink sm:px-5">
        <div className="halftone pointer-events-none absolute inset-0 text-black/12" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[12px] font-semibold leading-relaxed text-black/75">
            Ingin tahu produk mana yang paling menguntungkan setelah semua fee?
          </p>
          <div className="flex gap-2">
            <Link to="/app/seller/intelligence" className={cn(buttonVariants({ size: 'sm' }), 'bg-ink text-white hover:bg-ink/90')}>
              <Sparkles /> Buka intelligence
            </Link>
            <Button size="sm" variant="ghost" className="text-black/65 hover:bg-black/10 hover:text-black" onClick={() => window.location.assign('/app/monitor')}>
              Diskusi <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
