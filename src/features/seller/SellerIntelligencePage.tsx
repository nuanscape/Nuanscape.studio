import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Boxes, Brain, Flame, Package, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader, InsightCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { useSellerStore } from '@/stores/seller-store'
import { useAppStore } from '@/stores/app-store'
import { productMargin, shopMetrics } from '@/lib/metrics'
import { shopInsights } from '@/data/mock'
import { cn, formatIDR, formatPercent } from '@/lib/utils'

export function SellerIntelligencePage() {
  const { products, fees } = useSellerStore()
    const metrics = shopMetrics(products, fees)

  const ranked = [...products]
    .map((p) => {
      const revenue = p.price * p.sold
      const fee = (revenue * (fees.marketplacePct + fees.affiliatePct)) / 100
      const net = revenue - fee - p.cost * p.sold
      const marginPct = revenue > 0 ? (net / revenue) * 100 : 0
      const velocity = p.sold > 0 ? p.stock / (p.sold / 30) : 999
      return { p, revenue, net, marginPct, velocity, gross: productMargin(p) }
    })
    .sort((a, b) => b.net - a.net)

  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const atRisk = products.filter((p) => p.stock === 0 || (p.stock > 0 && p.stock <= p.minStock))
  const profitContrib = ranked.reduce((a, r) => a + Math.max(0, r.net), 0)
  const maxNet = Math.max(...ranked.map((r) => Math.abs(r.net)), 1)

  return (
    <div>
      <PageHeader
        title="Product intelligence"
        description="Gabungkan profit, kecepatan jual, stok, dan sinyal pasar untuk memutuskan apa yang layak ditingkatkan."
        actions={
          <>
            <Link to="/app/seller/products" className={buttonVariants({ variant: 'secondary' })}>
              <Package /> Kelola produk
            </Link>
            <Button onClick={() => window.location.assign('/app/monitor')}>
              <Brain /> Tanya Nuanscape AI
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net profit 30D" value={formatIDR(Math.round(metrics.netProfit))} deltaLabel={`margin ${formatPercent(metrics.margin)}`} icon={<Wallet />} tone={metrics.netProfit >= 0 ? 'positive' : 'danger'} accent="orange" />
        <MetricCard label="Produk terbaik" value={best ? best.p.name.split(' ').slice(0, 2).join(' ') : '-'} deltaLabel={best ? `${formatIDR(best.net, { compact: true })} net` : 'belum ada'} icon={<Flame />} accent="yellow" />
        <MetricCard label="Kontribusi profit" value={best ? formatPercent(profitContrib ? (best.net / profitContrib) * 100 : 0) : '-'} deltaLabel="dari produk teratas" icon={<TrendingUp />} tone="positive" accent="teal" />
        <MetricCard label="Stok berisiko" value={`${atRisk.length} produk`} deltaLabel="habis atau di bawah minimum" icon={<Boxes />} tone={atRisk.length ? 'warning' : 'positive'} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Kontribusi net profit"
            description="Estimasi per produk setelah fee, HPP, dan biaya"
            action={<Badge tone="outline">30 hari</Badge>}
          />
          <div className="space-y-2.5">
            {ranked.map(({ p, net, marginPct }) => (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate text-text-secondary">{p.name}</span>
                  <span className="num shrink-0 text-text-muted">{formatIDR(Math.round(net), { compact: true })} · {formatPercent(marginPct)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-white/[0.03]">
                  <div
                    className={cn('h-full rounded', net >= 0 ? 'bg-primary/70' : 'bg-danger/60')}
                    style={{ width: `${(Math.abs(net) / maxNet) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
            Estimasi memakai unit terjual × harga jual. Tidak memperhitungkan retur per produk dan
            biaya penyimpanan.
          </p>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Sinyal keputusan" description="Dari data lokal dan insight demo" />
          <div className="space-y-2.5">
            {shopInsights.slice(0, 4).map((insight) => (
              <InsightCard key={insight.id} {...insight} onAction={() => window.location.assign('/app/monitor')} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <SectionHeader title="Matriks produk" description="Margin, kecepatan jual, dan stok dalam satu tampilan" className="mb-0" />
          <Button variant="ghost" size="sm" onClick={() => window.location.assign('/app/monitor')}>
            Diskusikan <ArrowRight />
          </Button>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Produk</TH>
              <TH className="text-right">Margin</TH>
              <TH className="hidden sm:table-cell text-right">Terjual</TH>
              <TH className="hidden md:table-cell text-right">Cover stok</TH>
              <TH>Status sinyal</TH>
            </TR>
          </THead>
          <TBody>
            {ranked.map(({ p, marginPct, velocity, net }) => {
              const verdict =
                p.stock === 0
                  ? { label: 'Restock segera', tone: 'danger' as const }
                  : velocity < 10 && marginPct >= 15
                    ? { label: 'Stok tipis', tone: 'warning' as const }
                    : marginPct >= 25
                      ? { label: 'Perlu ditingkatkan', tone: 'primary' as const }
                      : net < 0
                        ? { label: 'Evaluasi harga', tone: 'danger' as const }
                        : marginPct < 15
                          ? { label: 'Margin rendah', tone: 'warning' as const }
                          : { label: 'Sehat', tone: 'primary' as const }
              return (
                <TR key={p.id}>
                  <TD>
                    <p className="text-[11px] text-text-primary">{p.name}</p>
                    <p className="text-[9px] text-text-muted">{p.sku} · stok {p.stock}</p>
                  </TD>
                  <TD className="text-right"><span className="num text-[11px] text-text-secondary">{formatPercent(marginPct)}</span></TD>
                  <TD className="hidden sm:table-cell text-right"><span className="num text-[11px] text-text-secondary">{p.sold}</span></TD>
                  <TD className="hidden md:table-cell text-right">
                    <span className="num text-[11px] text-text-secondary">
                      {velocity > 300 ? '—' : `${Math.max(0, Math.round(velocity))} hari`}
                    </span>
                  </TD>
                  <TD><Badge tone={verdict.tone}>{verdict.label}</Badge></TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
        <div className="border-t border-line px-5 py-3">
          <p className="text-[10px] leading-relaxed text-text-muted">
            Cover stok = stok saat ini ÷ rata-rata penjualan harian (30 hari). Produk tanpa penjualan
            ditampilkan “—”.
          </p>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-primary">Layak ditingkatkan</p>
          <p className="mt-2 text-[12px] font-medium text-text-primary">{best?.p.name ?? '—'}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
            Margin {best ? formatPercent(best.marginPct) : '—'} dengan {best?.p.sold ?? 0} unit terjual.
            Naikkan ads hanya jika cover stok cukup.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-warning">Perlu evaluasi</p>
          <p className="mt-2 text-[12px] font-medium text-text-primary">{worst?.p.name ?? '—'}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
            Margin {worst ? formatPercent(worst.marginPct) : '—'}. Cek HPP dan harga setelah fee sebelum
            menambah iklan.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-info">Stok kritis</p>
          <p className="mt-2 text-[12px] font-medium text-text-primary">{atRisk[0]?.name ?? 'Tidak ada'}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
            {atRisk.length
              ? `${atRisk.length} produk berada di bawah minimum. Prioritaskan yang penjualannya cepat.`
              : 'Semua stok di atas minimum saat ini.'}
          </p>
        </Card>
      </div>
    </div>
  )
}
