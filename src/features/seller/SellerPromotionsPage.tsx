import * as React from 'react'
import {
  BadgePercent,
  CalendarDays,
  Megaphone,
  Pause,
  Play,
  Plus,
  TicketPercent,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountScope } from '@/features/seller/components/account-scope'
import { AccountBadge } from '@/features/seller/components/seller-ui'
import { ProductModal } from '@/features/seller/components/product-modal'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { effectivePrice } from '@/lib/seller-ledger'
import { formatDate, formatIDR, formatPercent } from '@/lib/utils'
import type { Product, PromoStatus } from '@/types'

const statusTone: Record<PromoStatus, 'primary' | 'warning' | 'info' | 'outline'> = {
  active: 'primary',
  paused: 'warning',
  scheduled: 'info',
  ended: 'outline',
}

const statusLabel: Record<PromoStatus, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  scheduled: 'Terjadwal',
  ended: 'Selesai',
}

const voucherKindLabel = (kind: 'percent' | 'fixed' | 'shipping', value: number) =>
  kind === 'percent' ? `${value}%` : kind === 'fixed' ? formatIDR(value) : `Ongkir ${formatIDR(value, { compact: true })}`

export function SellerPromotionsPage() {
  const {
    vouchers,
    flashSales,
    ads,
    products,
    connections,
    activeAccountId,
    addVoucher,
    toggleVoucher,
    addFlashSale,
    toggleFlashSale,
    addAdCampaign,
    toggleAdCampaign,
    addAdBudget,
  } = useSellerStore()
  const { push } = useToastStore()
  const [tab, setTab] = React.useState('voucher')
  const [voucherOpen, setVoucherOpen] = React.useState(false)
  const [flashOpen, setFlashOpen] = React.useState(false)
  const [adOpen, setAdOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Product | undefined>()

  const scopedVouchers = activeAccountId === 'all' ? vouchers : vouchers.filter((v) => v.accountId === activeAccountId)
  const scopedSales = activeAccountId === 'all' ? flashSales : flashSales.filter((f) => f.accountId === activeAccountId)
  const scopedAds = activeAccountId === 'all' ? ads : ads.filter((a) => a.accountId === activeAccountId)
  const scopedProducts = activeAccountId === 'all' ? products : products.filter((p) => p.accountIds?.includes(activeAccountId))
  const connected = connections.filter((c) => c.status === 'connected')

  const promoCost =
    scopedVouchers.reduce((a, v) => {
      if (v.used <= 0) return a
      const perUse =
        v.kind === 'percent' ? Math.max(v.minSpend, 150000) * (v.value / 100) : v.value
      return a + perUse * v.used
    }, 0) +
    scopedSales.reduce((a, f) => {
      const product = products.find((p) => p.id === f.productId)
      return a + (product ? (product.price * f.discountPct * f.sold) / 100 : 0)
    }, 0)
  const adSpend = scopedAds.reduce((a, c) => a + c.spend, 0)
  const adRevenue = scopedAds.reduce((a, c) => a + c.revenue, 0)
  const activePromos =
    scopedVouchers.filter((v) => v.status === 'active').length +
    scopedSales.filter((f) => f.status === 'active').length +
    scopedAds.filter((a) => a.status === 'active').length
  const discounted = scopedProducts.filter((p) => (p.discountPct ?? 0) > 0)

  const defaultAccount = activeAccountId !== 'all' && connected.some((c) => c.id === activeAccountId)
    ? activeAccountId
    : connected[0]?.id ?? ''

  const [voucherForm, setVoucherForm] = React.useState({
    accountId: '',
    code: '',
    title: '',
    kind: 'percent' as 'percent' | 'fixed' | 'shipping',
    value: 10,
    minSpend: 150000,
    quota: 100,
    endDate: '',
  })
  const [flashForm, setFlashForm] = React.useState({
    accountId: '',
    productId: '',
    title: '',
    discountPct: 20,
    quota: 50,
    endDate: '',
  })
  const [adForm, setAdForm] = React.useState({
    accountId: '',
    name: '',
    objective: 'Sales' as 'Sales' | 'Traffic' | 'Live',
    budget: 2000000,
    endDate: '',
  })

  const openVoucher = () => {
    setVoucherForm({
      accountId: defaultAccount,
      code: '',
      title: '',
      kind: 'percent',
      value: 10,
      minSpend: 150000,
      quota: 100,
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    })
    setVoucherOpen(true)
  }

  const openFlash = () => {
    const firstProduct = scopedProducts[0] ?? products[0]
    setFlashForm({
      accountId: defaultAccount,
      productId: firstProduct?.id ?? '',
      title: firstProduct ? `Flash ${firstProduct.name}` : '',
      discountPct: 20,
      quota: 50,
      endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    })
    setFlashOpen(true)
  }

  const openAd = () => {
    setAdForm({
      accountId: defaultAccount,
      name: '',
      objective: 'Sales',
      budget: 2000000,
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    })
    setAdOpen(true)
  }

  const submitVoucher = () => {
    if (!voucherForm.accountId || !voucherForm.code.trim() || !voucherForm.title.trim()) return
    addVoucher({
      ...voucherForm,
      code: voucherForm.code.trim().toUpperCase(),
      title: voucherForm.title.trim(),
      endDate: new Date(voucherForm.endDate).toISOString(),
    })
    push({ title: 'Voucher dibuat', description: `${voucherForm.code.toUpperCase()} aktif untuk akun terpilih.`, tone: 'success' })
    setVoucherOpen(false)
  }

  const submitFlash = () => {
    if (!flashForm.accountId || !flashForm.productId || !flashForm.title.trim()) return
    addFlashSale({
      ...flashForm,
      title: flashForm.title.trim(),
      endDate: new Date(flashForm.endDate).toISOString(),
    })
    push({ title: 'Flash sale dibuat', description: flashForm.title, tone: 'success' })
    setFlashOpen(false)
  }

  const submitAd = () => {
    if (!adForm.accountId || !adForm.name.trim()) return
    addAdCampaign({
      ...adForm,
      name: adForm.name.trim(),
      endDate: new Date(adForm.endDate).toISOString(),
    })
    push({ title: 'Kampanye iklan dibuat', description: 'Kampanye dimulai dalam status dijeda.', tone: 'success' })
    setAdOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Promosi & iklan"
        description="Kelola voucher, flash sale, diskon produk, dan kampanye iklan per akun marketplace."
        actions={
          <>
            <AccountScope />
            <Button onClick={tab === 'voucher' ? openVoucher : tab === 'flash' ? openFlash : openAd}>
              <Plus /> {tab === 'voucher' ? 'Buat voucher' : tab === 'flash' ? 'Buat flash sale' : tab === 'ads' ? 'Buat kampanye' : 'Atur diskon'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Promo aktif" value={`${activePromos} program`} deltaLabel="voucher, flash sale, iklan" icon={<TicketPercent />} accent="orange" />
        <MetricCard label="Biaya promo" value={formatIDR(Math.round(promoCost))} deltaLabel="voucher + flash sale terpakai" icon={<BadgePercent />} tone="warning" accent="yellow" />
        <MetricCard label="Belanja iklan" value={formatIDR(adSpend)} deltaLabel={`ROAS ${adSpend ? (adRevenue / adSpend).toFixed(2) : '0.00'}x`} icon={<Megaphone />} accent="teal" />
        <MetricCard label="Produk diskon" value={`${discounted.length} SKU`} deltaLabel="diskon katalog aktif" icon={<Zap />} accent="pink" />
      </div>

      <div className="mt-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex w-full flex-wrap sm:w-auto">
            <TabsTrigger value="voucher"><TicketPercent /> Voucher</TabsTrigger>
            <TabsTrigger value="flash"><Zap /> Flash sale</TabsTrigger>
            <TabsTrigger value="ads"><Megaphone /> Iklan</TabsTrigger>
            <TabsTrigger value="discount"><BadgePercent /> Diskon produk</TabsTrigger>
          </TabsList>

          <TabsContent value="voucher" className="mt-3">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <SectionHeader
                  title="Voucher aktif & riwayat"
                  description="Pemakaian dihitung sebagai biaya promo pada buku kas"
                  action={<Badge tone="outline">{scopedVouchers.length} voucher</Badge>}
                  className="mb-0"
                />
              </div>
              <Table>
                <THead>
                  <TR>
                    <TH>Voucher</TH>
                    <TH className="hidden md:table-cell">Akun</TH>
                    <TH>Nilai</TH>
                    <TH className="hidden lg:table-cell">Min. belanja</TH>
                    <TH>Kuota</TH>
                    <TH className="hidden xl:table-cell">Periode</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {scopedVouchers.map((v) => (
                    <TR key={v.id}>
                      <TD>
                        <p className="font-mono text-[11px] text-text-primary">{v.code}</p>
                        <p className="text-[9px] text-text-muted">{v.title}</p>
                      </TD>
                      <TD className="hidden md:table-cell"><AccountBadge accountId={v.accountId} /></TD>
                      <TD><Badge tone="primary">{voucherKindLabel(v.kind, v.value)}</Badge></TD>
                      <TD className="hidden lg:table-cell"><span className="num text-[11px] text-text-secondary">{formatIDR(v.minSpend, { compact: true })}</span></TD>
                      <TD>
                        <div className="w-24">
                          <div className="flex justify-between text-[9px] text-text-muted">
                            <span>{v.used}/{v.quota}</span>
                            <span>{Math.round((v.used / Math.max(1, v.quota)) * 100)}%</span>
                          </div>
                          <Progress value={(v.used / Math.max(1, v.quota)) * 100} className="mt-1 h-1" />
                        </div>
                      </TD>
                      <TD className="hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                          <CalendarDays className="size-3" /> {formatDate(v.endDate, 'd MMM')}
                        </span>
                      </TD>
                      <TD><Badge tone={statusTone[v.status]}>{statusLabel[v.status]}</Badge></TD>
                      <TD className="text-right">
                        <Button size="sm" variant="ghost" disabled={v.status === 'ended'} onClick={() => toggleVoucher(v.id)}>
                          {v.status === 'active' ? <Pause /> : <Play />}
                          {v.status === 'active' ? 'Jeda' : 'Aktifkan'}
                        </Button>
                      </TD>
                    </TR>
                  ))}
                  {scopedVouchers.length === 0 ? (
                    <TR><TD colSpan={8}><p className="py-6 text-center text-[11px] text-text-muted">Belum ada voucher untuk cakupan ini.</p></TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="flash" className="mt-3">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <SectionHeader
                  title="Flash sale"
                  description="Diskon waktu terbatas per produk dan akun"
                  action={<Badge tone="outline">{scopedSales.length} program</Badge>}
                  className="mb-0"
                />
              </div>
              <Table>
                <THead>
                  <TR>
                    <TH>Program</TH>
                    <TH className="hidden md:table-cell">Akun</TH>
                    <TH>Harga flash</TH>
                    <TH>Terjual</TH>
                    <TH className="hidden xl:table-cell">Periode</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {scopedSales.map((f) => {
                    const product = products.find((p) => p.id === f.productId)
                    const flashPrice = product ? Math.round((product.price * (100 - f.discountPct)) / 100) : 0
                    return (
                      <TR key={f.id}>
                        <TD>
                          <p className="text-[11px] text-text-primary">{f.title}</p>
                          <p className="text-[9px] text-text-muted">{product?.sku ?? 'Produk dihapus'}</p>
                        </TD>
                        <TD className="hidden md:table-cell"><AccountBadge accountId={f.accountId} /></TD>
                        <TD>
                          <p className="num text-[11px] text-primary">{formatIDR(flashPrice)}</p>
                          <p className="num text-[9px] text-text-muted line-through">{formatIDR(product?.price ?? 0)}</p>
                        </TD>
                        <TD>
                          <div className="w-24">
                            <div className="flex justify-between text-[9px] text-text-muted">
                              <span>{f.sold}/{f.quota}</span>
                              <span>-{f.discountPct}%</span>
                            </div>
                            <Progress value={(f.sold / Math.max(1, f.quota)) * 100} className="mt-1 h-1" />
                          </div>
                        </TD>
                        <TD className="hidden xl:table-cell">
                          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                            <CalendarDays className="size-3" /> {formatDate(f.endDate, 'd MMM, HH:mm')}
                          </span>
                        </TD>
                        <TD><Badge tone={statusTone[f.status]}>{statusLabel[f.status]}</Badge></TD>
                        <TD className="text-right">
                          <Button size="sm" variant="ghost" disabled={f.status === 'ended'} onClick={() => toggleFlashSale(f.id)}>
                            {f.status === 'active' ? <Pause /> : <Play />}
                            {f.status === 'active' ? 'Jeda' : 'Aktifkan'}
                          </Button>
                        </TD>
                      </TR>
                    )
                  })}
                  {scopedSales.length === 0 ? (
                    <TR><TD colSpan={7}><p className="py-6 text-center text-[11px] text-text-muted">Belum ada flash sale untuk cakupan ini.</p></TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="mt-3">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <SectionHeader
                  title="Kampanye iklan"
                  description="Budget, spend, dan ROAS per kampanye"
                  action={<Badge tone="outline">{scopedAds.length} kampanye</Badge>}
                  className="mb-0"
                />
              </div>
              <Table>
                <THead>
                  <TR>
                    <TH>Kampanye</TH>
                    <TH className="hidden md:table-cell">Akun</TH>
                    <TH>Budget</TH>
                    <TH className="text-right">Spend</TH>
                    <TH className="text-right">Revenue</TH>
                    <TH className="hidden lg:table-cell text-right">ROAS</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {scopedAds.map((a) => (
                    <TR key={a.id}>
                      <TD>
                        <p className="text-[11px] text-text-primary">{a.name}</p>
                        <p className="text-[9px] text-text-muted">{a.objective} · {a.conversions} konversi</p>
                      </TD>
                      <TD className="hidden md:table-cell"><AccountBadge accountId={a.accountId} /></TD>
                      <TD>
                        <div className="w-28">
                          <div className="flex justify-between text-[9px] text-text-muted">
                            <span>{formatIDR(a.budget, { compact: true })}</span>
                            <span>{Math.round((a.spend / Math.max(1, a.budget)) * 100)}%</span>
                          </div>
                          <Progress value={(a.spend / Math.max(1, a.budget)) * 100} className="mt-1 h-1" />
                        </div>
                      </TD>
                      <TD className="text-right"><span className="num text-[11px] text-text-secondary">{formatIDR(a.spend, { compact: true })}</span></TD>
                      <TD className="text-right"><span className="num text-[11px] text-primary">{formatIDR(a.revenue, { compact: true })}</span></TD>
                      <TD className="hidden lg:table-cell text-right">
                        <Badge tone={a.spend && a.revenue / a.spend >= 2 ? 'primary' : 'warning'}>
                          {a.spend ? `${(a.revenue / a.spend).toFixed(2)}x` : '—'}
                        </Badge>
                      </TD>
                      <TD><Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge></TD>
                      <TD className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" disabled={a.status === 'ended'} onClick={() => toggleAdCampaign(a.id)}>
                            {a.status === 'active' ? <Pause /> : <Play />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => addAdBudget(a.id, 1000000)}>
                            <Wallet /> +1jt
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                  {scopedAds.length === 0 ? (
                    <TR><TD colSpan={8}><p className="py-6 text-center text-[11px] text-text-muted">Belum ada kampanye iklan untuk cakupan ini.</p></TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="discount" className="mt-3">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <SectionHeader
                  title="Diskon produk"
                  description="Diskon katalog melekat pada produk dan ikut dihitung di margin"
                  action={<Badge tone="outline">{discounted.length} SKU</Badge>}
                  className="mb-0"
                />
              </div>
              <Table>
                <THead>
                  <TR>
                    <TH>Produk</TH>
                    <TH className="hidden md:table-cell">Akun</TH>
                    <TH className="text-right">Harga normal</TH>
                    <TH className="text-right">Diskon</TH>
                    <TH className="text-right">Harga efektif</TH>
                    <TH className="hidden lg:table-cell text-right">Margin</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {scopedProducts.map((p) => {
                    const price = effectivePrice(p)
                    const margin = price > 0 ? ((price - p.cost) / price) * 100 : 0
                    return (
                      <TR key={p.id}>
                        <TD>
                          <p className="text-[11px] text-text-primary">{p.name}</p>
                          <p className="text-[9px] text-text-muted">{p.sku}</p>
                        </TD>
                        <TD className="hidden md:table-cell"><AccountBadge accountId={p.accountIds?.[0]} /></TD>
                        <TD className="text-right"><span className="num text-[11px] text-text-secondary">{formatIDR(p.price)}</span></TD>
                        <TD className="text-right">
                          {p.discountPct ? <Badge tone="warning">-{p.discountPct}%</Badge> : <span className="text-[10px] text-text-muted">—</span>}
                        </TD>
                        <TD className="text-right"><span className="num text-[11px] text-primary">{formatIDR(price)}</span></TD>
                        <TD className="hidden lg:table-cell text-right">
                          <Badge tone={margin >= 25 ? 'primary' : margin >= 10 ? 'warning' : 'danger'}>{formatPercent(margin)}</Badge>
                        </TD>
                        <TD className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Atur diskon</Button>
                        </TD>
                      </TR>
                    )
                  })}
                  {scopedProducts.length === 0 ? (
                    <TR><TD colSpan={7}><p className="py-6 text-center text-[11px] text-text-muted">Tidak ada produk untuk cakupan ini.</p></TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /><p className="text-[11px] font-medium text-text-primary">Aturan pencatatan</p></div>
          <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
            Pemakaian voucher, flash sale, dan belanja iklan otomatis masuk ke buku kas sebagai biaya promo.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><BadgePercent className="size-4 text-warning" /><p className="text-[11px] font-medium text-text-primary">Diskon produk</p></div>
          <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
            Diskon katalog menurunkan harga efektif dan margin, tetapi tidak menggandakan biaya promo.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><Megaphone className="size-4 text-danger" /><p className="text-[11px] font-medium text-text-primary">Cakupan akun</p></div>
          <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
            Pilih satu akun untuk melihat programnya saja. Tanpa pilihan, semua akun dan platform digabung.
          </p>
        </Card>
      </div>

      <Dialog
        open={voucherOpen}
        onClose={() => setVoucherOpen(false)}
        title="Buat voucher"
        description="Voucher langsung aktif dan tercatat sebagai biaya promo saat dipakai."
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoucherOpen(false)}>Batal</Button>
            <Button form="voucher-form" type="submit">Simpan voucher</Button>
          </>
        }
      >
        <form id="voucher-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitVoucher() }}>
          <Field label="Akun">
            <Select value={voucherForm.accountId} onChange={(e) => setVoucherForm((f) => ({ ...f, accountId: e.target.value }))}>
              {connected.map((c) => <option key={c.id} value={c.id}>{c.storeName} · {c.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kode voucher">
              <Input value={voucherForm.code} onChange={(e) => setVoucherForm((f) => ({ ...f, code: e.target.value }))} placeholder="STUDIO10" />
            </Field>
            <Field label="Judul">
              <Input value={voucherForm.title} onChange={(e) => setVoucherForm((f) => ({ ...f, title: e.target.value }))} placeholder="Diskon 10% pembelian pertama" />
            </Field>
            <Field label="Jenis">
              <Select value={voucherForm.kind} onChange={(e) => setVoucherForm((f) => ({ ...f, kind: e.target.value as typeof f.kind }))}>
                <option value="percent">Persen</option>
                <option value="fixed">Potongan tetap</option>
                <option value="shipping">Gratis ongkir</option>
              </Select>
            </Field>
            <Field label={voucherForm.kind === 'percent' ? 'Nilai (%)' : 'Nilai (Rp)'}>
              <Input type="number" min="1" value={voucherForm.value} onChange={(e) => setVoucherForm((f) => ({ ...f, value: Number(e.target.value) }))} />
            </Field>
            <Field label="Minimum belanja (Rp)">
              <Input type="number" min="0" value={voucherForm.minSpend} onChange={(e) => setVoucherForm((f) => ({ ...f, minSpend: Number(e.target.value) }))} />
            </Field>
            <Field label="Kuota">
              <Input type="number" min="1" value={voucherForm.quota} onChange={(e) => setVoucherForm((f) => ({ ...f, quota: Number(e.target.value) }))} />
            </Field>
            <Field label="Berakhir">
              <Input type="date" value={voucherForm.endDate} onChange={(e) => setVoucherForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={flashOpen}
        onClose={() => setFlashOpen(false)}
        title="Buat flash sale"
        description="Pilih produk, diskon, dan kuota. Program langsung aktif."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFlashOpen(false)}>Batal</Button>
            <Button form="flash-form" type="submit">Simpan flash sale</Button>
          </>
        }
      >
        <form id="flash-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitFlash() }}>
          <Field label="Akun">
            <Select value={flashForm.accountId} onChange={(e) => setFlashForm((f) => ({ ...f, accountId: e.target.value }))}>
              {connected.map((c) => <option key={c.id} value={c.id}>{c.storeName} · {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Produk">
            <Select value={flashForm.productId} onChange={(e) => setFlashForm((f) => ({ ...f, productId: e.target.value }))}>
              {scopedProducts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Judul">
              <Input value={flashForm.title} onChange={(e) => setFlashForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Diskon (%)">
              <Input type="number" min="1" max="90" value={flashForm.discountPct} onChange={(e) => setFlashForm((f) => ({ ...f, discountPct: Number(e.target.value) }))} />
            </Field>
            <Field label="Kuota">
              <Input type="number" min="1" value={flashForm.quota} onChange={(e) => setFlashForm((f) => ({ ...f, quota: Number(e.target.value) }))} />
            </Field>
            <Field label="Berakhir">
              <Input type="date" value={flashForm.endDate} onChange={(e) => setFlashForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={adOpen}
        onClose={() => setAdOpen(false)}
        title="Buat kampanye iklan"
        description="Kampanye dibuat dalam status dijeda agar budget dapat diperiksa lebih dulu."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdOpen(false)}>Batal</Button>
            <Button form="ad-form" type="submit">Simpan kampanye</Button>
          </>
        }
      >
        <form id="ad-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitAd() }}>
          <Field label="Akun">
            <Select value={adForm.accountId} onChange={(e) => setAdForm((f) => ({ ...f, accountId: e.target.value }))}>
              {connected.map((c) => <option key={c.id} value={c.id}>{c.storeName} · {c.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama kampanye">
              <Input value={adForm.name} onChange={(e) => setAdForm((f) => ({ ...f, name: e.target.value }))} placeholder="Studio Always-On" />
            </Field>
            <Field label="Tujuan">
              <Select value={adForm.objective} onChange={(e) => setAdForm((f) => ({ ...f, objective: e.target.value as typeof f.objective }))}>
                <option value="Sales">Sales</option>
                <option value="Traffic">Traffic</option>
                <option value="Live">Live</option>
              </Select>
            </Field>
            <Field label="Budget (Rp)">
              <Input type="number" min="100000" step="100000" value={adForm.budget} onChange={(e) => setAdForm((f) => ({ ...f, budget: Number(e.target.value) }))} />
            </Field>
            <Field label="Berakhir">
              <Input type="date" value={adForm.endDate} onChange={(e) => setAdForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>
        </form>
      </Dialog>

      <ProductModal open={Boolean(editing)} onClose={() => setEditing(undefined)} product={editing} />
    </div>
  )
}
