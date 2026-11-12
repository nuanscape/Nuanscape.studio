import type { Order, Product } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

export function StockBar({ product, className }: { product: Product; className?: string }) {
  const target = Math.max(product.minStock * 3, 1)
  const pct = Math.min(100, (product.stock / target) * 100)
  const tone = product.stock === 0 ? 'bg-danger' : product.stock <= product.minStock ? 'bg-warning' : 'bg-primary'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}>
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}
