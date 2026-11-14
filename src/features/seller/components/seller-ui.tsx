import type { Order, Product } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSellerStore } from '@/stores/seller-store'

const orderTone: Record<Order['status'], 'default' | 'primary' | 'warning' | 'danger' | 'info' | 'outline'> = {
  Pending: 'warning',
  Processing: 'info',
  Shipped: 'info',
  Completed: 'primary',
  Cancelled: 'danger',
  Returned: 'danger',
}

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
  return <Badge tone={orderTone[status]}>{status}</Badge>
}

export function MarketplaceBadge({ marketplace }: { marketplace: Order['marketplace'] | Product['marketplace'] }) {
  return (
    <Badge tone={marketplace === 'TikTok Shop' ? 'primary' : marketplace === 'Shopee' ? 'warning' : 'outline'}>
      {marketplace}
    </Badge>
  )
}

export function StockBadge({ product }: { product: Product }) {
  if (product.stock === 0) return <Badge tone="danger">Habis</Badge>
  if (product.stock <= product.minStock) return <Badge tone="warning">Stok rendah</Badge>
  return <Badge tone="primary">Tersedia</Badge>
}

export function StockBar({ product, className }: { product: Product; className?: string }) {  const target = Math.max(product.minStock * 3, 1)
  const pct = Math.min(100, (product.stock / target) * 100)
  const tone = product.stock === 0 ? 'bg-danger' : product.stock <= product.minStock ? 'bg-warning' : 'bg-primary'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}>
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function AccountBadge({ accountId, className }: { accountId?: string; className?: string }) {
  const account = useSellerStore((s) => s.connections.find((c) => c.id === accountId))
  if (!account) return <span className={cn('text-[10px] text-text-muted', className)}>—</span>
  return (
    <span
      className={cn('inline-flex max-w-full items-center gap-1.5', className)}
      title={`${account.name} · ${account.storeName}`}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', account.status === 'connected' ? 'bg-teal' : 'bg-white/25')}
      />
      <span className="truncate text-[10px] text-text-secondary">{account.storeName}</span>
    </span>
  )
}

export function AccountCount({ accountIds }: { accountIds?: string[] }) {
  const connections = useSellerStore((s) => s.connections)
  const names = (accountIds ?? [])
    .map((id) => connections.find((c) => c.id === id)?.storeName)
    .filter((name): name is string => Boolean(name))
  if (!names.length) return <span className="text-[10px] text-text-muted">—</span>
  return (
    <span title={names.join(', ')}>
      <Badge tone="outline">{names.length} akun</Badge>
    </span>
  )
}
