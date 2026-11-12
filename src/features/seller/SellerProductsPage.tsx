import * as React from 'react'
import { Boxes, MoreHorizontal, Package, Pencil, Plus, Search, Trash2, TrendingUp } from 'lucide-react'
import { PageHeader, MetricCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { TD, TH, THead, TBody, TR, Table, TableEmpty } from '@/components/ui/table'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MarketplaceBadge, StockBar, StockBadge } from '@/features/seller/components/seller-ui'
import { ProductModal } from '@/features/seller/components/product-modal'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { productMargin } from '@/lib/metrics'
import { cn, formatIDR, formatPercent } from '@/lib/utils'
import type { Product } from '@/types'

export function SellerProductsPage() {
  const { products, deleteProduct, restockProduct } = useSellerStore()
  const { push } = useToastStore()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Product | undefined>()
  const [toDelete, setToDelete] = React.useState<Product | null>(null)
  const [query, setQuery] = React.useState('')
  const [marketplace, setMarketplace] = React.useState('all')
  const [stockFilter, setStockFilter] = React.useState('all')
  const [page, setPage] = React.useState(1)
  const perPage = 8

  const filtered = products
    .filter((p) => marketplace === 'all' || p.marketplace === marketplace)
    .filter((p) => {
      if (stockFilter === 'low') return p.stock > 0 && p.stock <= p.minStock
      if (stockFilter === 'out') return p.stock === 0
      if (stockFilter === 'active') return p.status === 'Active'
      return true
    })
    .filter((p) => !query.trim() || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()))

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  const inventoryValue = products.reduce((a, p) => a + p.cost * p.stock, 0)
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const outOfStock = products.filter((p) => p.stock === 0)

  const restock = (p: Product) => {
    restockProduct(p.id, Math.max(p.minStock * 2, 20))
    push({ title: 'Restock dicatat', description: `${p.name} +${Math.max(p.minStock * 2, 20)} unit`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Produk"
        description="Kelola katalog, harga, HPP, dan margin lintas marketplace."
        actions={
          <Button onClick={() => { setEditing(undefined); setOpen(true) }}>
            <Plus /> Tambah produk
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total produk" value={`${products.length} SKU`} deltaLabel={`${products.filter((p) => p.status === 'Active').length} aktif`} icon={<Package />} accent="orange" />
        <MetricCard label="Nilai inventory" value={formatIDR(inventoryValue)} deltaLabel={`${products.reduce((a, p) => a + p.stock, 0)} unit`} icon={<Boxes />} accent="yellow" />
        <MetricCard label="Stok rendah" value={`${lowStock.length} produk`} deltaLabel="di bawah minimum" icon={<TrendingUp />} tone="warning" accent="teal" />
        <MetricCard label="Stok habis" value={`${outOfStock.length} produk`} deltaLabel="tidak bisa dijual" icon={<Package />} tone={outOfStock.length ? 'danger' : 'default'} accent="pink" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Cari produk, SKU, kategori…"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={marketplace} onChange={(e) => { setMarketplace(e.target.value); setPage(1) }} className="h-9 w-auto min-w-[130px] text-xs">
              <option value="all">Semua marketplace</option>
              <option value="TikTok Shop">TikTok Shop</option>
              <option value="Shopee">Shopee</option>
              <option value="Both">Both</option>
            </Select>
            <Select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1) }} className="h-9 w-auto min-w-[120px] text-xs">
              <option value="all">Semua stok</option>
              <option value="active">Aktif</option>
              <option value="low">Stok rendah</option>
              <option value="out">Stok habis</option>
            </Select>
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Produk</TH>
              <TH className="hidden md:table-cell">Marketplace</TH>
              <TH>Harga / HPP</TH>
              <TH className="hidden sm:table-cell">Margin</TH>
              <TH>Stok</TH>
              <TH className="hidden lg:table-cell">Status</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={7}>Tidak ada produk yang cocok.</TableEmpty>
            ) : (
              rows.map((p) => {
                const margin = productMargin(p)
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-text-primary">{p.name}</p>
                        <p className="text-[10px] text-text-muted">{p.sku} · {p.category}</p>
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell"><MarketplaceBadge marketplace={p.marketplace} /></TD>
                    <TD>
                      <p className="num text-[11px] text-text-primary">{formatIDR(p.price)}</p>
                      <p className="text-[9px] text-text-muted">HPP {formatIDR(p.cost, { compact: true })}</p>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <span className={cn('num text-[11px]', margin.pct >= 45 ? 'text-primary' : margin.pct >= 30 ? 'text-text-primary' : 'text-warning')}>
                        {formatPercent(margin.pct)}
                      </span>
                      <p className="text-[9px] text-text-muted">{formatIDR(margin.gross, { compact: true })}</p>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="num w-8 text-[11px] text-text-primary">{p.stock}</span>
                        <StockBar product={p} className="w-14" />
                      </div>
                      <div className="mt-1"><StockBadge product={p} /></div>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <Badge tone={p.status === 'Active' ? 'primary' : p.status === 'Paused' ? 'outline' : 'danger'}>{p.status}</Badge>
                    </TD>
                    <TD className="text-right">
                      <DropdownMenu
                        width="w-44"
                        trigger={<Button variant="ghost" size="icon-sm" aria-label="Aksi produk"><MoreHorizontal /></Button>}
                      >
                        <DropdownItem icon={<Pencil />} onClick={() => { setEditing(p); setOpen(true) }}>Edit produk</DropdownItem>
                        <DropdownItem icon={<Plus />} onClick={() => restock(p)}>Restock +{Math.max(p.minStock * 2, 20)}</DropdownItem>
                        <DropdownItem icon={<Trash2 />} danger onClick={() => setToDelete(p)}>Hapus produk</DropdownItem>
                      </DropdownMenu>
                    </TD>
                  </TR>
                )
              })
            )}
          </TBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <p className="text-[11px] text-text-muted">
            {rows.length} dari {filtered.length} produk
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setPage((x) => x - 1)}>Sebelumnya</Button>
            <Badge tone="outline">{currentPage} / {totalPages}</Badge>
            <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((x) => x + 1)}>Berikutnya</Button>
          </div>
        </div>
      </Card>

      <ProductModal open={open} onClose={() => { setOpen(false); setEditing(undefined) }} product={editing} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteProduct(toDelete.id)
            push({ title: 'Produk dihapus', description: toDelete.name, tone: 'info' })
          }
        }}
        title="Hapus produk?"
        description={toDelete ? `“${toDelete.name}” akan dihapus dari katalog lokal.` : undefined}
        confirmLabel="Hapus produk"
      />
    </div>
  )
}
