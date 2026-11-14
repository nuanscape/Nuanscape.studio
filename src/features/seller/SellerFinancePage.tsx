import * as React from 'react'
import { Download, Percent, RotateCcw, Save, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { BarTrendChart, DonutChart } from '@/components/charts/charts'
import { AccountScope } from '@/features/seller/components/account-scope'
import { AccountBadge } from '@/features/seller/components/seller-ui'
import { useSellerStore, type FeeConfig } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import {
  buildSellerLedger,
  ledgerByAccount,
  ledgerByProduct,
  ledgerDailySeries,
  ledgerTypeMeta,
  scopeLedger,
  summarizeLedger,
} from '@/lib/seller-ledger'
import { cn, downloadText, formatDate, formatIDR, formatPercent } from '@/lib/utils'

const feeFields: Array<{ key: keyof FeeConfig; label: string; hint: string; suffix: string }> = [
  { key: 'marketplacePct', label: 'Fee marketplace', hint: 'Komisi platform dari nilai pesanan', suffix: '%' },
  { key: 'affiliatePct', label: 'Fee afiliasi', hint: 'Komisi afiliator / creator', suffix: '%' },
  { key: 'shippingPerOrder', label: 'Shipping per order', hint: 'Ongkir rata-rata ditanggung toko', suffix: 'Rp' },
  { key: 'adsMonthly', label: 'Target iklan bulanan', hint: 'Referensi budget; biaya aktual dari kampanye', suffix: 'Rp' },
  { key: 'opexMonthly', label: 'Opex bulanan', hint: 'Dialokasikan proporsional ke tiap akun', suffix: 'Rp' },
]

const ledgerTone = (type: keyof typeof ledgerTypeMeta) => ledgerTypeMeta[type].tone

export function SellerFinancePage() {
  const {
    products,
    orders,
    connections,
    vouchers,
    flashSales,
    ads,
    fees,
    updateFees,
    activeAccountId,
  } = useSellerStore()
  const { push } = useToastStore()
  const [draft, setDraft] = React.useState<FeeConfig>(fees)
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [visible, setVisible] = React.useState(25)

  React.useEffect(() => setDraft(fees), [fees])

  const changed = JSON.stringify(draft) !== JSON.stringify(fees)

  const allEntries = React.useMemo(
    () => buildSellerLedger({ orders, products, connections, vouchers, flashSales, ads, fees }),
    [orders, products, connections, vouchers, flashSales, ads, fees],
  )
  const entries = React.useMemo(() => scopeLedger(allEntries, activeAccountId), [allEntries, activeAccountId])
  const summary = React.useMemo(() => summarizeLedger(entries), [entries])
  const series = React.useMemo(() => ledgerDailySeries(entries), [entries])
  const accountMap = React.useMemo(() => ledgerByAccount(entries), [entries])
  const productMap = React.useMemo(() => ledgerByProduct(entries), [entries])

  const activeAccount = connections.find((c) => c.id === activeAccountId)

  const filteredEntries = entries
    .filter((e) => typeFilter === 'all' || e.type === typeFilter)
    .filter((e) => {
      if (!query.trim()) return true
      const text = `${e.label} ${e.detail ?? ''} ${e.ref ?? ''}`.toLowerCase()
      return text.includes(query.toLowerCase())
    })

  const costMix = [
    { name: 'Diskon promo', value: summary.discounts, color: '#FFD166' },
    { name: 'Refund', value: summary.refunds, color: '#F0512B' },
    { name: 'HPP', value: summary.cogs, color: '#6DBBFF' },
    { name: 'Fee platform', value: summary.platformFees, color: '#F5D64B' },
    { name: 'Fee afiliasi', value: summary.affiliateFees, color: '#FFE9A3' },
    { name: 'Ongkir', value: summary.shipping, color: '#24C7C4' },
    { name: 'Iklan', value: summary.ads, color: '#F58FD9' },
    { name: 'Opex', value: summary.opex, color: '#62798A' },
  ].filter((x) => x.value > 0)

  const waterfall = [
    { name: 'Pemasukan', value: summary.income, type: 'total' as const },
    { name: 'Diskon promo', value: -summary.discounts, type: 'negative' as const },
    { name: 'Refund', value: -summary.refunds, type: 'negative' as const },
    { name: 'HPP', value: -summary.cogs, type: 'negative' as const },
    { name: 'Fee platform', value: -summary.platformFees, type: 'negative' as const },
    { name: 'Fee afiliasi', value: -summary.affiliateFees, type: 'negative' as const },
    { name: 'Ongkir', value: -summary.shipping, type: 'negative' as const },
    { name: 'Iklan', value: -summary.ads, type: 'negative' as const },
    { name: 'Opex', value: -summary.opex, type: 'negative' as const },
    { name: 'Saldo bersih', value: summary.net, type: 'total' as const },
  ]
  const maxAbs = Math.max(1, ...waterfall.map((w) => Math.abs(w.value)))

  const save = () => {
    updateFees(draft)
    push({ title: 'Fee diperbarui', description: 'Buku kas dan saldo bersih dihitung ulang.', tone: 'success' })
  }

  const exportLedger = () => {
    const header = ['Tanggal', 'Akun', 'Marketplace', 'Jenis', 'Keterangan', 'Referensi', 'Nominal']
    const rows = filteredEntries.map((e) => [
      formatDate(e.date, 'yyyy-MM-dd HH:mm'),
      connections.find((c) => c.id === e.accountId)?.storeName ?? e.accountId,
      e.marketplace,
      ledgerTypeMeta[e.type].label,
      `${e.label}${e.detail ? ` - ${e.detail}` : ''}`,
      e.ref ?? '',
      String(e.amount),
    ])
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadText(`buku-kas-${activeAccountId}.csv`, csv, 'text/csv;charset=utf-8')
    push({ title: 'Buku kas diekspor', description: `${filteredEntries.length} entri diunduh sebagai CSV.`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Finance & saldo bersih"
        description="Pemasukan, diskon, fee platform, iklan, HPP, dan saldo bersih tercatat per akun."
        actions={
          <>
            <AccountScope />
            <Button variant="ghost" onClick={() => setDraft(fees)} disabled={!changed}>
              <RotateCcw /> Reset
            </Button>
            <Button onClick={save} disabled={!changed}>
              <Save /> Simpan fee
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total pemasukan" value={formatIDR(summary.income)} deltaLabel={`${summary.orders} pesanan settled`} icon={<TrendingUp />} accent="orange" />
        <MetricCard label="Total potongan" value={formatIDR(Math.round(summary.totalCost))} deltaLabel="promo, fee, HPP, iklan, opex" icon={<Percent />} tone="warning" accent="yellow" />
        <MetricCard label="Saldo bersih" value={formatIDR(Math.round(summary.net))} deltaLabel={`margin ${formatPercent(summary.margin)}`} icon={<Wallet />} tone={summary.net >= 0 ? 'positive' : 'danger'} accent="teal" />
        <MetricCard label="Siap dicairkan" value={formatIDR(Math.round(summary.payout))} deltaLabel="setelah seluruh biaya" icon={<Wallet />} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Arus kas 7 hari"
            description={activeAccount ? activeAccount.storeName : 'Gabungan seluruh akun'}
            action={<Badge tone={summary.net >= 0 ? 'primary' : 'danger'}>{summary.net >= 0 ? 'positif' : 'negatif'}</Badge>}
          />
          <BarTrendChart
            data={series}
            xKey="label"
            series={[
              { key: 'income', label: 'Pemasukan', color: '#F5D64B' },
              { key: 'expense', label: 'Biaya', color: '#F0512B' },
            ]}
            height={250}
          />
        </Card>

        <Card className="p-5">
          <SectionHeader title="Alokasi biaya" description="Dari seluruh entri buku kas" />
          {costMix.length ? (
            <>
              <DonutChart
                data={costMix}
                height={180}
                centerValue={formatPercent(summary.margin)}
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
            </>
          ) : (
            <p className="py-10 text-center text-[11px] text-text-muted">Belum ada biaya tercatat untuk cakupan ini.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Waterfall saldo" description="Pemasukan dikurangi seluruh potongan" />
          <div className="space-y-1.5">
            {waterfall.map((w) => (
              <div key={w.name} className="flex items-center gap-2">
                <span className="w-[102px] shrink-0 text-[10px] text-text-muted">{w.name}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-white/[0.03]">
                  <div
                    className={cn('h-full rounded', w.type === 'total' ? 'bg-primary/70' : 'bg-danger/45')}
                    style={{ width: `${(Math.abs(w.value) / maxAbs) * 100}%` }}
                  />
                </div>
                <span className={cn('num w-20 text-right text-[10px]', w.type === 'total' ? 'text-primary' : 'text-text-secondary')}>
                  {w.value < 0 ? '-' : ''}{formatIDR(Math.abs(w.value), { compact: true })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-line p-3">
              <p className="text-[10px] text-text-muted">AOV</p>
              <p className="num mt-0.5 text-[13px] text-text-primary">{formatIDR(summary.aov)}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-[10px] text-text-muted">Promo + iklan</p>
              <p className="num mt-0.5 text-[13px] text-warning">{formatIDR(summary.discounts + summary.ads, { compact: true })}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-[10px] text-text-muted">Entri tercatat</p>
              <p className="num mt-0.5 text-[13px] text-text-primary">{entries.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <SectionHeader
              title={activeAccount ? 'Kontribusi produk' : 'Kontribusi akun'}
              description={activeAccount ? 'Saldo bersih per produk dalam akun ini' : 'Saldo bersih per akun marketplace'}
              className="mb-0"
            />
          </div>
          <div className="divide-y divide-line">
            {activeAccount
              ? Array.from(productMap.entries())
                  .sort((a, b) => b[1].net - a[1].net)
                  .slice(0, 6)
                  .map(([productId, value]) => {
                    const product = products.find((p) => p.id === productId)
                    return (
                      <div key={productId} className="flex items-center gap-2 px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] text-text-primary">{product?.name ?? 'Produk dihapus'}</p>
                          <p className="text-[9px] text-text-muted">{product?.sku ?? productId}</p>
                        </div>
                        <span className="num text-[11px] text-text-muted">{formatIDR(value.income, { compact: true })}</span>
                        <span className={cn('num w-20 text-right text-[11px]', value.net >= 0 ? 'text-primary' : 'text-danger')}>
                          {formatIDR(Math.round(value.net), { compact: true })}
                        </span>
                      </div>
                    )
                  })
              : Array.from(accountMap.entries())
                  .sort((a, b) => b[1].net - a[1].net)
                  .map(([accountId, value]) => {
                    const account = connections.find((c) => c.id === accountId)
                    return (
                      <div key={accountId} className="flex items-center gap-2 px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <AccountBadge accountId={accountId} />
                          <p className="mt-0.5 text-[9px] text-text-muted">{account?.name} · {value.entries} entri</p>
                        </div>
                        <span className="num text-[11px] text-text-muted">{formatIDR(value.income, { compact: true })}</span>
                        <span className={cn('num w-20 text-right text-[11px]', value.net >= 0 ? 'text-primary' : 'text-danger')}>
                          {formatIDR(Math.round(value.net), { compact: true })}
                        </span>
                      </div>
                    )
                  })}
            {(activeAccount ? productMap.size : accountMap.size) === 0 ? (
              <p className="px-5 py-8 text-center text-[11px] text-text-muted">Belum ada kontribusi tercatat.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 lg:flex-row lg:items-center">
          <SectionHeader
            title="Buku kas"
            description="Semua pemasukan dan potongan, terurut dari yang terbaru"
            action={<Badge tone="outline">{filteredEntries.length} entri</Badge>}
            className="mb-0 flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setVisible(25) }} className="h-9 w-[150px] text-xs">
              <option value="all">Semua jenis</option>
              {Object.entries(ledgerTypeMeta).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </Select>
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setVisible(25) }}
              placeholder="Cari keterangan…"
              className="h-9 w-[190px] text-xs"
            />
            <Button variant="secondary" size="sm" onClick={exportLedger}>
              <Download /> CSV
            </Button>
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Tanggal</TH>
              <TH>Keterangan</TH>
              <TH className="hidden md:table-cell">Jenis</TH>
              <TH className="hidden lg:table-cell">Akun</TH>
              <TH className="hidden xl:table-cell">Marketplace</TH>
              <TH className="text-right">Nominal</TH>
            </TR>
          </THead>
          <TBody>
            {filteredEntries.slice(0, visible).map((entry) => (
              <TR key={entry.id}>
                <TD><span className="num text-[10px] text-text-muted">{formatDate(entry.date, 'd MMM HH:mm')}</span></TD>
                <TD>
                  <p className="text-[11px] text-text-primary">{entry.label}</p>
                  <p className="text-[9px] text-text-muted">{entry.detail}{entry.ref ? ` · ${entry.ref}` : ''}</p>
                </TD>
                <TD className="hidden md:table-cell"><Badge tone={ledgerTone(entry.type)}>{ledgerTypeMeta[entry.type].label}</Badge></TD>
                <TD className="hidden lg:table-cell"><AccountBadge accountId={entry.accountId} /></TD>
                <TD className="hidden xl:table-cell"><span className="text-[10px] text-text-muted">{entry.marketplace}</span></TD>
                <TD className="text-right">
                  <span className={cn('num text-[11px]', entry.amount >= 0 ? 'text-primary' : 'text-text-secondary')}>
                    {entry.amount >= 0 ? '+' : '-'}{formatIDR(Math.abs(entry.amount))}
                  </span>
                </TD>
              </TR>
            ))}
            {filteredEntries.length === 0 ? (
              <TR><TD colSpan={6}><p className="py-8 text-center text-[11px] text-text-muted">Tidak ada entri yang cocok.</p></TD></TR>
            ) : null}
          </TBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <p className="text-[10px] text-text-muted">
            Menampilkan {Math.min(visible, filteredEntries.length)} dari {filteredEntries.length} entri.
          </p>
          {visible < filteredEntries.length ? (
            <Button size="sm" variant="ghost" onClick={() => setVisible((v) => v + 25)}>Muat lebih banyak</Button>
          ) : null}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <SectionHeader title="Konfigurasi fee" description="Dipakai untuk menghitung seluruh entri biaya" />
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
              <span className={cn('num', summary.margin >= 15 ? 'text-primary' : 'text-warning')}>{formatPercent(summary.margin)}</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
            Perubahan fee hanya tersimpan lokal. Biaya iklan memakai spend aktual dari kampanye, bukan target bulanan.
          </p>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Ringkasan pemotongan" description="Agar mudah diaudit per komponen" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { label: 'Diskon voucher & flash sale', value: summary.discounts },
              { label: 'Refund pesanan', value: summary.refunds },
              { label: 'Fee marketplace', value: summary.platformFees },
              { label: 'Fee afiliasi', value: summary.affiliateFees },
              { label: 'Ongkir ditanggung', value: summary.shipping },
              { label: 'HPP barang terjual', value: summary.cogs },
              { label: 'Belanja iklan', value: summary.ads },
              { label: 'Opex teralokasi', value: summary.opex },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <span className="text-[10px] text-text-muted">{row.label}</span>
                <span className="num text-[11px] text-text-secondary">-{formatIDR(Math.round(row.value), { compact: true })}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
            <span className="text-[11px] text-text-secondary">Saldo bersih setelah semua potongan</span>
            <span className={cn('num text-[13px]', summary.net >= 0 ? 'text-primary' : 'text-danger')}>{formatIDR(Math.round(summary.net))}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
