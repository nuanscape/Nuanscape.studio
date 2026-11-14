import * as React from 'react'
import { ChevronRight, Download, Package, Search, Truck, Wallet } from 'lucide-react'
import { PageHeader, MetricCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { TD, TH, THead, TBody, TR, Table, TableEmpty } from '@/components/ui/table'
import { AccountScope } from '@/features/seller/components/account-scope'
import { AccountBadge, MarketplaceBadge, OrderStatusBadge } from '@/features/seller/components/seller-ui'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import type { Order } from '@/types'
import { downloadText, formatDate, formatIDR } from '@/lib/utils'

const statuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled', 'Returned']

export function SellerOrdersPage() {
  const { orders, connections, updateOrderStatus, activeAccountId } = useSellerStore()
  const { push } = useToastStore()
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [marketplace, setMarketplace] = React.useState('all')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [nextStatus, setNextStatus] = React.useState<Order['status']>('Processing')

  React.useEffect(() => setMarketplace('all'), [activeAccountId])

  const scopedOrders = activeAccountId === 'all' ? orders : orders.filter((o) => o.accountId === activeAccountId)

  const filtered = scopedOrders
    .filter((o) => status === 'all' || o.status === status)
    .filter((o) => marketplace === 'all' || o.marketplace === marketplace)
    .filter((o) => !query.trim() || `${o.id} ${o.customer} ${o.product}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const selected = scopedOrders.find((o) => o.id === selectedId)
  const totalValue = filtered.reduce((a, o) => a + o.total, 0)

  const exportCsv = () => {
    const header = 'Order,Customer,Product,Qty,Total,Status,Marketplace,Account,Date\n'
    const accountName = (id: string) => connections.find((c) => c.id === id)?.storeName ?? id
    const body = filtered
      .map((o) => [o.id, `"${o.customer}"`, `"${o.product}"`, o.qty, o.total, o.status, o.marketplace, `"${accountName(o.accountId)}"`, o.date].join(','))
      .join('\n')
    downloadText(`orders-${new Date().toISOString().slice(0, 10)}.csv`, header + body)
    push({ title: 'Pesanan diekspor', description: `${filtered.length} baris CSV.`, tone: 'success' })
  }

  const openDetail = (o: Order) => {
    setSelectedId(o.id)
    setNextStatus(o.status)
  }

  return (
    <div>
      <PageHeader
        title="Pesanan"
        description="Kelola pesanan dari semua akun marketplace dengan status yang konsisten."
        actions={
          <>
            <AccountScope />
            <Button variant="secondary" onClick={exportCsv}>
              <Download /> Ekspor CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total pesanan" value={`${filtered.length} order`} deltaLabel={formatIDR(totalValue, { compact: true })} icon={<Package />} accent="orange" />
        <MetricCard label="Perlu diproses" value={`${scopedOrders.filter((o) => o.status === 'Pending' || o.status === 'Processing').length} order`} deltaLabel="pending & processing" icon={<Package />} tone="warning" accent="yellow" />
        <MetricCard label="Dikirim" value={`${scopedOrders.filter((o) => o.status === 'Shipped').length} order`} deltaLabel="dalam perjalanan" icon={<Truck />} accent="teal" />
        <MetricCard label="Selesai" value={`${scopedOrders.filter((o) => o.status === 'Completed').length} order`} deltaLabel="completed" icon={<Wallet />} tone="positive" accent="pink" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari order, pelanggan, produk…" className="h-9 pl-8 text-xs" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[130px] text-xs">
              <option value="all">Semua status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            {activeAccountId === 'all' ? (
              <Select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="h-9 w-auto min-w-[130px] text-xs">
                <option value="all">Semua marketplace</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Shopee">Shopee</option>
              </Select>
            ) : null}
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Order</TH>
              <TH className="hidden sm:table-cell">Pelanggan</TH>
              <TH>Produk</TH>
              <TH className="hidden md:table-cell">Marketplace</TH>
              <TH className="hidden lg:table-cell">Akun</TH>
              <TH>Status</TH>
              <TH className="text-right">Total</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={8}>Tidak ada pesanan yang cocok.</TableEmpty>
            ) : (
              filtered.map((o) => (
                <TR key={o.id} className="cursor-pointer" onClick={() => openDetail(o)}>
                  <TD>
                    <p className="num text-[11px] font-medium text-text-primary">{o.id}</p>
                    <p className="text-[9px] text-text-muted">{formatDate(o.date, 'd MMM HH:mm')}</p>
                  </TD>
                  <TD className="hidden sm:table-cell"><span className="text-[11px] text-text-secondary">{o.customer}</span></TD>
                  <TD>
                    <p className="max-w-[180px] truncate text-[11px] text-text-primary">{o.product}</p>
                    <p className="text-[9px] text-text-muted">{o.qty} unit</p>
                  </TD>
                  <TD className="hidden md:table-cell"><MarketplaceBadge marketplace={o.marketplace} /></TD>
                  <TD className="hidden lg:table-cell"><AccountBadge accountId={o.accountId} /></TD>
                  <TD><OrderStatusBadge status={o.status} /></TD>
                  <TD className="text-right"><span className="num text-[11px] text-text-primary">{formatIDR(o.total)}</span></TD>
                  <TD><ChevronRight className="size-3.5 text-text-muted" /></TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <p className="text-[11px] text-text-muted">Menampilkan {filtered.length} pesanan · klik baris untuk detail</p>
          <Button variant="ghost" size="sm" onClick={exportCsv}><Download /> Ekspor hasil filter</Button>
        </div>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title="Detail pesanan"
        description={selected?.id}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedId(null)}>Tutup</Button>
            <Button
              onClick={() => {
                if (selected) {
                  updateOrderStatus(selected.id, nextStatus)
                  push({ title: 'Status pesanan diperbarui', description: `${selected.id} → ${nextStatus}`, tone: 'success' })
                  setSelectedId(null)
                }
              }}
            >
              Simpan status
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[12px] font-medium text-text-primary">{selected.customer}</p>
                  <p className="text-[10px] text-text-muted">{formatDate(selected.date, 'EEEE, d MMM yyyy HH:mm')}</p>
                </div>
                <MarketplaceBadge marketplace={selected.marketplace} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <div>
                  <p className="text-[11px] text-text-secondary">{selected.product}</p>
                  <p className="text-[10px] text-text-muted">{selected.qty} × {formatIDR(selected.total / selected.qty)}</p>
                </div>
                <p className="num text-[14px] font-semibold text-text-primary">{formatIDR(selected.total)}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-text-secondary">Status pesanan</p>
              <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as Order['status'])}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
                Perubahan status hanya tersimpan lokal. Tidak ada pembaruan yang dikirim ke
                marketplace pada demo ini.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="outline">Marketplace: {selected.marketplace}</Badge>
              <AccountBadge accountId={selected.accountId} />
              <Badge tone="outline">Qty: {selected.qty}</Badge>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
