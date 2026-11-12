import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  inventoryMovements as seedMovements,
  marketplaceConnections as seedConnections,
  orders as seedOrders,
  products as seedProducts,
} from '@/data/mock'
import type {
  InventoryMovement,
  MarketplaceConnection,
  Order,
  Product,
} from '@/types'
import { uid } from '@/lib/utils'

export interface FeeConfig {
  marketplacePct: number
  affiliatePct: number
  shippingPerOrder: number
  adsMonthly: number
  opexMonthly: number
}

interface SellerState {
  products: Product[]
  orders: Order[]
  movements: InventoryMovement[]
  connections: MarketplaceConnection[]
  fees: FeeConfig
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'sold'>) => void
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  restockProduct: (id: string, qty: number) => void
  updateOrderStatus: (id: string, status: Order['status']) => void
  syncMarketplace: (id: string) => Promise<void>
  updateFees: (patch: Partial<FeeConfig>) => void
}

export const useSellerStore = create<SellerState>()(
  persist(
    (set, get) => ({
      products: seedProducts,
      orders: seedOrders,
      movements: seedMovements,
      connections: seedConnections,
      fees: {
        marketplacePct: 7,
        affiliatePct: 2,
        shippingPerOrder: 12500,
        adsMonthly: 3750000,
        opexMonthly: 2400000,
      },
      addProduct: (p) =>
        set((s) => ({
          products: [
            {
              ...p,
              id: uid('p'),
              sold: 0,
              createdAt: new Date().toISOString(),
            },
            ...s.products,
          ],
        })),
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
      restockProduct: (id, qty) =>
        set((s) => {
          const products = s.products.map((p) =>
            p.id === id
              ? { ...p, stock: p.stock + qty, status: p.status === 'Out of Stock' ? ('Active' as const) : p.status }
              : p,
          )
          const product = s.products.find((p) => p.id === id)
          return {
            products,
            movements: [
              {
                id: uid('im'),
                productId: id,
                type: 'in' as const,
                qty,
                note: `Restock manual${product ? ` — ${product.name}` : ''}`,
                date: new Date().toISOString(),
              },
              ...s.movements,
            ],
          }
        }),
      updateOrderStatus: (id, status) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) })),
      syncMarketplace: async (id) => {
        set((s) => ({
          connections: s.connections.map((c) => (c.id === id ? { ...c, status: 'syncing' } : c)),
        }))
        await new Promise((r) => setTimeout(r, 1300))
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id
              ? { ...c, status: 'connected', lastSync: new Date().toISOString(), note: undefined }
              : c,
          ),
        }))
        void get()
      },
      updateFees: (patch) => set((s) => ({ fees: { ...s.fees, ...patch } })),
    }),
    {
      name: 'nuanscape-seller',
      partialize: (s) => ({
        products: s.products,
        orders: s.orders,
        movements: s.movements,
        connections: s.connections,
        fees: s.fees,
      }),
    },
  ),
)
