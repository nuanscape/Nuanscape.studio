import * as React from 'react'
import { Percent, RotateCcw, Save, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input } from '@/components/ui/input'
import { TD, TH, THead, TBody, TR, Table } from '@/components/ui/table'
import { AreaTrendChart, DonutChart } from '@/components/charts/charts'
import { useSellerStore, type FeeConfig } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { productMargin, profitWaterfall, shopMetrics } from '@/lib/metrics'
import { shopSeries } from '@/data/mock'
import { cn, formatIDR, formatPercent } from '@/lib/utils'

const feeFields: Array<{ key: keyof FeeConfig; label: string; hint: string; suffix: string }> = [
  { key: 'marketplacePct', label: 'Fee marketplace', hint: 'Komisi platform dari net sales', suffix: '%' },
  { key: 'affiliatePct', label: 'Fee afiliasi', hint: 'Komisi afiliator / creator', suffix: '%' },
  { key: 'shippingPerOrder', label: 'Shipping per order', hint: 'Rata-rata ongkos kirim ditanggung', suffix: 'Rp' },
  { key: 'adsMonthly', label: 'Ads bulanan', hint: 'Belanja iklan 30 hari', suffix: 'Rp' },
  { key: 'opexMonthly', label: 'Opex bulanan', hint: 'Operasional toko di luar ads', suffix: 'Rp' },
]

export function SellerFinancePage() {
  const { products, fees, updateFees } = useSellerStore()
  const { push } = useToastStore()
  const metrics = shopMetrics(products, fees)
  const waterfall = profitWaterfall(products, fees)
  const [draft, setDraft] = React.useState<FeeConfig>(fees)

  React.useEffect(() => setDraft(fees), [fees])

  const changed = JSON.stringify(draft) !== JSON.stringify(fees)

  const save = () => {
    updateFees(draft)
    push({ title: 'Fee diperbarui', description: 'Semua estimasi profit dihitung ulang.', tone: 'success' })
  }

  const reset = () => setDraft(fees)

  const costMix = [
    { name: 'COGS', value: metrics.cogs, color: '#6DBBFF' },
    { name: 'Fee marketplace', value: Math.round(metrics.marketplaceFees), color: '#FFD166' },
    { name: 'Shipping', value: Math.round(metrics.shipping), color: '#FFE9A3' },
    { name: 'Ads', value: metrics.ads, color: '#F0512B' },
    { name: 'Opex', value: metrics.opex, color: '#62798A' },
    { name: 'Net profit', value: Math.max(0, Math.round(metrics.netProfit)), color: '#F5D64B' },
  ]

  const ranked = [...products]
    .map((p) => {
      const revenue = p.price * p.sold
      const fee = (revenue * (fees.marketplacePct + fees.affiliatePct)) / 100
      const net = revenue - fee - p.cost * p.sold
      return { p, revenue, fee, net, margin: revenue > 0 ? (net / revenue) * 100 : 0 }
    })
    .sort((a, b) => b.net - a.net)

  return (
    <div>
      <PageHeader
        title="Finance & profit"
        description="Hitung profit bersih setelah fee marketplace, afiliasi, iklan, dan operasional."
        actions={
          <>
            <Button variant="ghost" onClick={reset} disabled={!changed}>
              <RotateCcw /> Reset
            </Button>
            <Button onClick={save} disabled={!changed}>
              <Save /> Simpan fee
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net sales 30D" value={formatIDR(metrics.netSales)} deltaLabel="setelah diskon & refund" icon={<TrendingUp />} accent="orange" />
        <MetricCard label="Gross profit" value={formatIDR(metrics.grossProfit)} deltaLabel={`${formatPercent((metrics.grossProfit / metrics.netSales) * 100)} dari net sales`} icon={<Wallet />} accent="yellow" />
        <MetricCard label="Net profit" value={formatIDR(Math.round(metrics.netProfit))} deltaLabel={`margin ${formatPercent(metrics.margin)}`} icon={<Wallet />} tone={metrics.netProfit >= 0 ? 'positive' : 'danger'} accent="teal" />
        <MetricCard label="Total fee & biaya" value={formatIDR(Math.round(metrics.marketplaceFees + metrics.shipping + metrics.ads + metrics.opex))} deltaLabel={`${formatPercent(((metrics.marketplaceFees + metrics.shipping + metrics.ads + metrics.opex) / metrics.netSales) * 100)} dari net sales`} icon={<Percent />} tone="warning" accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Revenue 7 hari" description="TikTok Seller vs Shopee" action={<Badge tone="primary">+14,8%</Badge>} />
          <AreaTrendChart
            data={shopSeries}
            xKey="label"
            series={[
              { key: 'tiktok', label: 'TikTok Shop', color: '#F5D64B' },
              { key: 'shopee', label: 'Shopee', color: '#FFD166' },
            ]}
            height={250}
          />
        </Card>

        <Card className="p-5">
          <SectionHeader title="Alokasi biaya" description="Dari net sales 30 hari" />
          <DonutChart
            data={costMix}
            height={180}
            centerValue={formatPercent(metrics.margin)}
            centerLabel="net margin"
          />
          <div className="mt-3 space-y-1.5">
            {costMix.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-[10px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-text-muted">{c.name}</span>
                <span className="num text-text-secondary">{formatIDR(c.value, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <SectionHeader title="Konfigurasi fee" description="Dipakai untuk semua estimasi profit" />
          <div className="space-y-3">
            {feeFields.map((f) => (
              <div key={f.key}>
                <Field label={f.label} hint={f.hint}>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step={f.suffix === '%' ? '0.1' : '1000'}
                      value={draft[f.key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: Number(e.target.value) }))}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">{f.suffix}</span>
                  </div>
                </Field>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Total fee marketplace</span>
              <span className="num text-text-primary">{formatPercent(fees.marketplacePct + fees.affiliatePct)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Net margin</span>
              <span className={cn('num', metrics.margin >= 15 ? 'text-primary' : 'text-warning')}>{formatPercent(metrics.margin)}</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
            Perubahan fee hanya tersimpan lokal dan tidak mengubah data marketplace asli.
          </p>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <SectionHeader title="Waterfall profit" description="Estimasi 30 hari" className="mb-0" />
          </div>
          <div className="p-5">
            <div className="space-y-1.5">
              {waterfall.map((w) => {
                const max = Math.max(...waterfall.map((x) => Math.abs(x.value)))
                return (
                  <div key={w.name} className="flex items-center gap-2">
                    <span className="w-[96px] shrink-0 text-[10px] text-text-muted">{w.name}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-white/[0.03]">
                      <div
                        className={cn('h-full rounded', w.type === 'total' ? 'bg-primary/70' : 'bg-danger/45')}
                        style={{ width: `${max ? (Math.abs(w.value) / max) * 100 : 0}%` }}
                      />
                    </div>
                    <span className={cn('num w-20 text-right text-[10px]', w.type === 'total' ? 'text-primary' : 'text-text-secondary')}>
                      {w.value < 0 ? '-' : ''}{formatIDR(Math.abs(w.value), { compact: true })}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line p-3">
                <p className="text-[10px] text-text-muted">AOV</p>
                <p className="num mt-0.5 text-[13px] text-text-primary">{formatIDR(metrics.aov)}</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <p className="text-[10px] text-text-muted">Pesanan</p>
                <p className="num mt-0.5 text-[13px] text-text-primary">{metrics.orders}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="border-b border-line px-5 py-4">
          <SectionHeader title="Profit per produk" description="Estimasi dari unit terjual × harga, dikurangi fee dan HPP" className="mb-0" />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Produk</TH>
              <TH className="text-right">Revenue</TH>
              <TH className="hidden sm:table-cell text-right">Fee</TH>
              <TH className="text-right">Net profit</TH>
              <TH className="hidden md:table-cell text-right">Margin</TH>
            </TR>
          </THead>
          <TBody>
            {ranked.map(({ p, revenue, fee, net, margin }) => (
              <TR key={p.id}>
                <TD>
                  <p className="text-[11px] text-text-primary">{p.name}</p>
                  <p className="text-[9px] text-text-muted">{p.sold} terjual · {formatIDR(p.price, { compact: true })}</p>
                </TD>
                <TD className="text-right"><span className="num text-[11px] text-text-secondary">{formatIDR(revenue, { compact: true })}</span></TD>
                <TD className="hidden sm:table-cell text-right"><span className="num text-[11px] text-text-muted">-{formatIDR(fee, { compact: true })}</span></TD>
                <TD className="text-right"><span className={cn('num text-[11px]', net >= 0 ? 'text-primary' : 'text-danger')}>{formatIDR(Math.round(net), { compact: true })}</span></TD>
                <TD className="hidden md:table-cell text-right">
                  <Badge tone={margin >= 25 ? 'primary' : margin >= 10 ? 'warning' : 'danger'}>{formatPercent(margin)}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <div className="border-t border-line px-5 py-3">
          <p className="text-[10px] leading-relaxed text-text-muted">
            Margin produk memakai fee konfigurasi saat ini ({formatPercent(fees.marketplacePct + fees.affiliatePct)}).
            Gross margin katalog tanpa fee: {formatPercent(productMargin(products[0]).pct)} pada produk pertama.
          </p>
        </div>
      </Card>
    </div>
  )
}
