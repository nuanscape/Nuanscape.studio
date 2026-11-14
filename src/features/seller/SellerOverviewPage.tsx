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
import { AccountScope } from '@/features/seller/components/account-scope'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import {
  buildSellerLedger,
  ledgerPlatformSeries,
  scopeLedger,
  summarizeLedger,
} from '@/lib/seller-ledger'
import { shopInsights } from '@/data/mock'
import { cn, formatDate, formatIDR, formatPercent } from '@/lib/utils'
import { AccountBadge, MarketplaceBadge, OrderStatusBadge, StockBar } from '@/features/seller/components/seller-ui'

export function SellerOverviewPage() {
  const {
    products,
    orders,
    connections,
    vouchers,
    flashSales,
    ads,
    fees,
    restockProduct,
    activeAccountId,
    setActiveAccount,
  } = useSellerStore()
  const { push } = useToastStore()

  const entries = React.useMemo(
    () => scopeLedger(
      buildSellerLedger({ orders, products, connections, vouchers, flashSales, ads, fees }),
      activeAccountId,
    ),
    [orders, products, connections, vouchers, flashSales, ads, fees, activeAccountId],
  )
  const metrics = React.useMemo(() => summarizeLedger(entries), [entries])
  const series = React.useMemo(() => ledgerPlatformSeries(entries), [entries])
  const scopedProducts = activeAccountId === 'all'
    ? products
    : products.filter((p) => p.accountIds?.includes(activeAccountId))
  const scopedOrders = activeAccountId === 'all'
    ? orders
    : orders.filter((o) => o.accountId === activeAccountId)
  const inventoryValue = scopedProducts.reduce((a, p) => a + p.cost * p.stock, 0)
  const inventoryUnits = scopedProducts.reduce((a, p) => a + p.stock, 0)
  const lowStock = scopedProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const outOfStock = scopedProducts.filter((p) => p.stock === 0)
  const incomeEntries = entries.filter((e) => e.type === 'income')
  const tiktokIncome = incomeEntries.filter((e) => e.marketplace === 'TikTok Shop').reduce((a, e) => a + e.amount, 0)
  const shopeeIncome = incomeEntries.filter((e) => e.marketplace === 'Shopee').reduce((a, e) => a + e.amount, 0)
  const platformMix = [
    { name: 'TikTok Shop', value: tiktokIncome, color: '#F5D64B' },
    { name: 'Shopee', value: shopeeIncome, color: '#FFD166' },
  ].filter((x) => x.value > 0)
  const waterfall = [
    { name: 'Pemasukan', value: metrics.income, type: 'total' as const },
    { name: 'Diskon promo', value: -metrics.discounts, type: 'negative' as const },
    { name: 'Refund', value: -metrics.refunds, type: 'negative' as const },
    { name: 'HPP', value: -metrics.cogs, type: 'negative' as const },
    { name: 'Fee & ongkir', value: -(metrics.platformFees + metrics.affiliateFees + metrics.shipping), type: 'negative' as const },
    { name: 'Iklan + opex', value: -(metrics.ads + metrics.opex), type: 'negative' as const },
    { name: 'Saldo bersih', value: metrics.net, type: 'total' as const },
  ]
  const maxAbs = Math.max(1, ...waterfall.map((w) => Math.abs(w.value)))
  const recent = [...scopedOrders].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)
  const connectedAccounts = connections.filter((c) => c.status === 'connected')

  const restock = (id: string, name: string, qty: number) => {
    restockProduct(id, qty)
    push({ title: 'Restock dicatat', description: `${qty} unit ${name} ditambahkan.`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Seller overview"
        description="Pantau pemasukan, saldo bersih, stok, dan pesanan per akun marketplace."
        actions={
          <>
            <AccountScope />
            <Link to="/app/seller/marketplaces" className={buttonVariants({ variant: 'secondary' })}>
              <ShoppingBag /> Marketplaces
            </Link>
            <Link to="/app/seller/finance" className={buttonVariants()}>
              <Wallet /> Buku kas
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total pemasukan" value={formatIDR(metrics.income)} deltaLabel={`${metrics.orders} pesanan settled`} icon={<TrendingUp />} accent="orange" />
        <MetricCard label="Saldo bersih" value={formatIDR(Math.round(metrics.net))} deltaLabel={`margin ${formatPercent(metrics.margin)}`} icon={<Wallet />} tone={metrics.net >= 0 ? 'positive' : 'danger'} accent="yellow" />
        <MetricCard label="Pesanan" value={`${scopedOrders.length} order`} deltaLabel={`AOV ${formatIDR(metrics.aov, { compact: true })}`} icon={<Package />} accent="teal" />
        <MetricCard label="Inventory value" value={formatIDR(inventoryValue)} deltaLabel={`${inventoryUnits} unit`} icon={<Boxes />} tone={lowStock.length ? 'warning' : 'default'} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Revenue by marketplace"
            description="7 hari terakhir"
            action={<Badge tone="primary">{activeAccountId === 'all' ? 'Semua akun' : 'Akun terpilih'}</Badge>}
          />
          <BarTrendChart
            data={series}
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
          <SectionHeader title="Marketplace mix" description="Porsi pemasukan tercatat" />
          <DonutChart
            data={platformMix.length ? platformMix : [{ name: 'Belum ada', value: 1, color: '#2a2a2a' }]}
            height={170}
            centerValue={formatIDR(metrics.income, { compact: true })}
            centerLabel="pemasukan"
          />
          <div className="mt-3 space-y-2">
            {platformMix.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="flex-1 text-text-secondary">{m.name}</span>
                <span className="text-text-muted">{incomeEntries.filter((e) => e.marketplace === m.name).length} order</span>
                <span className="num text-text-primary">{formatIDR(m.value, { compact: true })}</span>
              </div>
            ))}
            {platformMix.length === 0 ? <p className="text-[10px] text-text-muted">Belum ada pemasukan settled pada cakupan ini.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader
          title="Akun marketplace"
          description={`${connectedAccounts.length} dari ${connections.length} akun tertaut · maksimal 3 akun per platform`}
          action={<Link to="/app/seller/marketplaces" className="text-[10px] text-primary">Kelola akun</Link>}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(['TikTok Shop', 'Shopee'] as const).map((platform) => {
            const accounts = connections.filter((c) => c.name === platform)
            const linked = accounts.filter((c) => c.status === 'connected').length
            return (
              <div key={platform} className="rounded-xl border border-line bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <MarketplaceBadge marketplace={platform} />
                  <span className="text-[10px] text-text-muted">{linked}/{accounts.length} tertaut</span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setActiveAccount(activeAccountId === account.id ? 'all' : account.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                        activeAccountId === account.id
                          ? 'border-primary/35 bg-primary/[0.08]'
                          : 'border-line/60 bg-white/[0.02] hover:border-line-strong',
                      )}
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', account.status === 'connected' ? 'bg-teal' : 'bg-white/20')} />
                      <span className="min-w-0 flex-1 truncate text-[10px] text-text-secondary">{account.storeName}</span>
                      <span className="shrink-0 text-[9px] text-text-muted">
                        {activeAccountId === account.id ? 'Dipilih' : account.status === 'connected' ? 'Tertaut' : 'Terputus'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card className="p-5">
          <SectionHeader title="Saldo waterfall" description="Dari pemasukan ke saldo bersih" action={<Link to="/app/seller/finance" className="text-[10px] text-primary">Detail</Link>} />
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
            Diskon, iklan, dan opex ikut dipotong. Ubah di halaman Finance untuk melihat dampak.
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
                  <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
                    <span>{o.customer}</span>
                    <span>·</span>
                    <span>{formatDate(o.date, 'd MMM HH:mm')}</span>
                    <AccountBadge accountId={o.accountId} />
                  </div>
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
            description={`${lowStock.length + outOfStock.length} produk perlu perhatian`}
            action={<Link to="/app/seller/inventory" className="text-[10px] text-primary">Inventory</Link>}
          />
          <div className="space-y-2.5">
            {[...outOfStock, ...lowStock].slice(0, 5).map((p) => (
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
            {lowStock.length + outOfStock.length === 0 ? (
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
