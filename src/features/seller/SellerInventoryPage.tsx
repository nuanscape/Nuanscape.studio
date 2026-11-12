import * as React from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, PackagePlus, Search } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Field, Select } from '@/components/ui/input'
import { StockBar, StockBadge } from '@/features/seller/components/seller-ui'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { cn, formatDate, formatIDR } from '@/lib/utils'
import type { InventoryMovement } from '@/types'

const movementMeta: Record<InventoryMovement['type'], { label: string; tone: 'primary' | 'warning' | 'danger' | 'info'; icon: React.ReactNode }> = {
  in: { label: 'Masuk', tone: 'primary', icon: <ArrowDownLeft className="size-3.5" /> },
  out: { label: 'Keluar', tone: 'info', icon: <ArrowUpRight className="size-3.5" /> },
  damaged: { label: 'Rusak', tone: 'danger', icon: <AlertTriangle className="size-3.5" /> },
  reserved: { label: 'Reserved', tone: 'warning', icon: <Boxes className="size-3.5" /> },
}

export function SellerInventoryPage() {
  const { products, movements, restockProduct } = useSellerStore()
  const { push } = useToastStore()
  const [query, setQuery] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [qty, setQty] = React.useState(20)
  const [reason, setReason] = React.useState('in')

  const inventoryValue = products.reduce((a, p) => a + p.cost * p.stock, 0)
  const units = products.reduce((a, p) => a + p.stock, 0)
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const out = products.filter((p) => p.stock === 0)
  const selected = products.find((p) => p.id === selectedId)

  const sorted = [...products]
    .filter((p) => !query.trim() || `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.stock / Math.max(1, a.minStock) - b.stock / Math.max(1, b.minStock))

  const submitRestock = () => {
    if (!selected || qty <= 0) return
    restockProduct(selected.id, qty)
    push({ title: 'Stok diperbarui', description: `${selected.name} +${qty} unit (${reason === 'in' ? 'restock' : 'koreksi'}).`, tone: 'success' })
    setSelectedId(null)
    setQty(20)
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Pantau stok, nilai persediaan, dan riwayat pergerakan barang."
        actions={
          <Button onClick={() => { setSelectedId(products[0]?.id ?? null); setQty(20) }}>
            <PackagePlus /> Catat restock
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Nilai inventory" value={formatIDR(inventoryValue)} deltaLabel="berdasarkan HPP" icon={<Boxes />} accent="orange" />
        <MetricCard label="Total unit" value={`${units} unit`} deltaLabel={`${products.length} SKU`} icon={<Boxes />} accent="yellow" />
        <MetricCard label="Stok rendah" value={`${low.length} produk`} deltaLabel="≤ minimum" icon={<AlertTriangle />} tone="warning" accent="teal" />
        <MetricCard label="Stok habis" value={`${out.length} produk`} deltaLabel="perlu restock" icon={<AlertTriangle />} tone={out.length ? 'danger' : 'positive'} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center">
            <SectionHeader title="Level stok" description="Diurutkan dari paling kritis" className="mb-0 flex-1" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk…" className="h-9 pl-8 text-xs sm:w-52" />
            </div>
          </div>
          <div className="divide-y divide-line">
            {sorted.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-text-primary">{p.name}</p>
                  <p className="text-[9px] text-text-muted">{p.sku} · min {p.minStock} · {formatIDR(p.cost, { compact: true })}/unit</p>
                </div>
                <div className="w-28">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="num text-text-primary">{p.stock}</span>
                    <StockBadge product={p} />
                  </div>
                  <StockBar product={p} className="mt-1" />
                </div>
                <Button size="sm" variant="soft" onClick={() => { setSelectedId(p.id); setQty(Math.max(p.minStock * 2, 20)) }}>
                  Restock
                </Button>
              </div>
            ))}
            {sorted.length === 0 ? <p className="p-6 text-center text-[11px] text-text-muted">Produk tidak ditemukan.</p> : null}
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-4 py-4">
            <SectionHeader title="Pergerakan stok" description={`${movements.length} catatan`} className="mb-0" />
          </div>
          <div className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {movements.map((m) => {
              const meta = movementMeta[m.type]
              const product = products.find((p) => p.id === m.productId)
              return (
                <div key={m.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className={cn(
                    'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border',
                    meta.tone === 'primary' && 'border-primary/20 bg-primary/[0.06] text-primary',
                    meta.tone === 'danger' && 'border-danger/20 bg-danger/[0.06] text-danger',
                    meta.tone === 'warning' && 'border-warning/20 bg-warning/[0.06] text-warning',
                    meta.tone === 'info' && 'border-info/20 bg-info/[0.06] text-info',
                  )}>
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[11px] text-text-primary">{product?.name ?? 'Produk dihapus'}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-[9px] text-text-muted">{m.note}</p>
                    <p className="text-[9px] text-text-muted">{formatDate(m.date, 'd MMM yyyy HH:mm')}</p>
                  </div>
                  <span className="num text-[11px] text-text-secondary">{m.type === 'out' || m.type === 'damaged' ? '-' : '+'}{m.qty}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Aturan inventory" description="Agar analisis stok tetap dapat dipercaya" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { t: 'Minimum stok per SKU', d: 'Stok di bawah minimum memicu peringatan, bukan pembelian otomatis.' },
            { t: 'Perubahan tercatat', d: 'Setiap restock membuat catatan pergerakan agar dapat diaudit.' },
            { t: 'Angka HPP dipakai', d: 'Nilai inventory memakai HPP, bukan harga jual, agar tidak melebih-lebihkan aset.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
              <p className="text-[11px] font-medium text-text-primary">{x.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title="Catat restock"
        description={selected ? `${selected.name} · stok saat ini ${selected.stock}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedId(null)}>Batal</Button>
            <Button onClick={submitRestock}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Produk">
            <Select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jumlah">
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </Field>
            <Field label="Jenis">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="in">Restock pembelian</option>
                <option value="correction">Koreksi stok</option>
              </Select>
            </Field>
          </div>
          <p className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
            Hanya penambahan stok yang didukung pada demo ini. Pengurangan karena penjualan berasal
            dari pesanan marketplace.
          </p>
        </div>
      </Dialog>
    </div>
  )
}
