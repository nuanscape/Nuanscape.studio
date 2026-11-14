import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  adCampaigns as seedAds,
  flashSales as seedFlashSales,
  inventoryMovements as seedMovements,
  marketplaceConnections as seedConnections,
  orders as seedOrders,
  products as seedProducts,
  vouchers as seedVouchers,
} from '@/data/mock'
import type {
  AdCampaign,
  FlashSale,
  InventoryMovement,
  MarketplaceConnection,
  Order,
  Product,
  Voucher,
} from '@/types'
import { uid } from '@/lib/utils'

export interface FeeConfig {
  marketplacePct: number
  affiliatePct: number
  shippingPerOrder: number
  adsMonthly: number
  opexMonthly: number
}

export const MAX_MARKETPLACE_ACCOUNTS = 3

interface SellerState {
  products: Product[]
  orders: Order[]
  movements: InventoryMovement[]
  connections: MarketplaceConnection[]
  vouchers: Voucher[]
  flashSales: FlashSale[]
  ads: AdCampaign[]
  fees: FeeConfig
  activeAccountId: string
  setActiveAccount: (id: string) => void
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'sold'>) => void
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  restockProduct: (id: string, qty: number) => void
  updateOrderStatus: (id: string, status: Order['status']) => void
  connectMarketplace: (id: string) => void
  disconnectMarketplace: (id: string) => void
  syncMarketplace: (id: string) => Promise<void>
  updateFees: (patch: Partial<FeeConfig>) => void
  addVoucher: (v: {
    code: string
    title: string
    accountId: string
    kind: Voucher['kind']
    value: number
    minSpend: number
    quota: number
    endDate: string
  }) => void
  toggleVoucher: (id: string) => void
  addFlashSale: (f: {
    title: string
    accountId: string
    productId: string
    discountPct: number
    quota: number
    endDate: string
  }) => void
  toggleFlashSale: (id: string) => void
  addAdCampaign: (a: {
    name: string
    accountId: string
    objective: AdCampaign['objective']
    budget: number
    endDate: string
  }) => void
  toggleAdCampaign: (id: string) => void
  addAdBudget: (id: string, amount: number) => void
}

export const useSellerStore = create<SellerState>()(
  persist(
    (set, get) => ({
      products: seedProducts,
      orders: seedOrders,
      movements: seedMovements,
      connections: seedConnections,
      vouchers: seedVouchers,
      flashSales: seedFlashSales,
      ads: seedAds,
      activeAccountId: 'all',
      setActiveAccount: (id) => set({ activeAccountId: id }),
      fees: {
        marketplacePct: 7,
        affiliatePct: 2,
        shippingPerOrder: 12500,
        adsMonthly: 3750000,
        opexMonthly: 2400000,
      },
      addProduct: (p) => {
        const accountIds =
          p.accountIds?.length
            ? p.accountIds
            : get()
                .connections.filter((c) => p.marketplace === 'Both' || c.name === p.marketplace)
                .map((c) => c.id)
        set((s) => ({
          products: [
            {
              ...p,
              accountIds,
              id: uid('p'),
              sold: 0,
              createdAt: new Date().toISOString(),
            },
            ...s.products,
          ],
        }))
      },
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
      connectMarketplace: (id) =>
        set((s) => {
          const target = s.connections.find((c) => c.id === id)
          if (!target || target.status === 'connected') return {}
          const connected = s.connections.filter(
            (c) => c.name === target.name && c.status === 'connected',
          ).length
          if (connected >= MAX_MARKETPLACE_ACCOUNTS) return {}
          return {
            connections: s.connections.map((c) =>
              c.id === id
                ? { ...c, status: 'connected' as const, lastSync: new Date().toISOString(), note: undefined }
                : c,
            ),
          }
        }),
      disconnectMarketplace: (id) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'disconnected' as const,
                  note: 'Tautan diputus manual. Tautkan kembali untuk melanjutkan sinkronisasi.',
                }
              : c,
          ),
        })),
      syncMarketplace: async (id) => {
        const target = get().connections.find((c) => c.id === id)
        if (!target || target.status === 'disconnected') return
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
      addVoucher: (v) => {
        const account = get().connections.find((c) => c.id === v.accountId)
        if (!account) return
        set((s) => ({
          vouchers: [
            {
              ...v,
              id: uid('v'),
              marketplace: account.name,
              used: 0,
              startDate: new Date().toISOString(),
              status: 'active',
            },
            ...s.vouchers,
          ],
        }))
      },
      toggleVoucher: (id) =>
        set((s) => ({
          vouchers: s.vouchers.map((v) =>
            v.id === id && v.status !== 'ended'
              ? { ...v, status: v.status === 'active' ? 'paused' : 'active' }
              : v,
          ),
        })),
      addFlashSale: (f) => {
        const account = get().connections.find((c) => c.id === f.accountId)
        if (!account) return
        set((s) => ({
          flashSales: [
            {
              ...f,
              id: uid('f'),
              marketplace: account.name,
              sold: 0,
              startDate: new Date().toISOString(),
              status: 'active',
            },
            ...s.flashSales,
          ],
        }))
      },
      toggleFlashSale: (id) =>
        set((s) => ({
          flashSales: s.flashSales.map((f) =>
            f.id === id && f.status !== 'ended'
              ? { ...f, status: f.status === 'active' ? 'paused' : 'active' }
              : f,
          ),
        })),
      addAdCampaign: (a) => {
        const account = get().connections.find((c) => c.id === a.accountId)
        if (!account) return
        set((s) => ({
          ads: [
            {
              ...a,
              id: uid('a'),
              marketplace: account.name,
              spend: 0,
              revenue: 0,
              impressions: 0,
              clicks: 0,
              conversions: 0,
              startDate: new Date().toISOString(),
              status: 'paused',
            },
            ...s.ads,
          ],
        }))
      },
      toggleAdCampaign: (id) =>
        set((s) => ({
          ads: s.ads.map((a) =>
            a.id === id && a.status !== 'ended'
              ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
              : a,
          ),
        })),
      addAdBudget: (id, amount) =>
        set((s) => ({
          ads: s.ads.map((a) => (a.id === id ? { ...a, budget: a.budget + amount } : a)),
        })),
    }),
    {
      name: 'nuanscape-seller-v4',
      partialize: (s) => ({
        products: s.products,
        orders: s.orders,
        movements: s.movements,
        connections: s.connections,
        vouchers: s.vouchers,
        flashSales: s.flashSales,
        ads: s.ads,
        fees: s.fees,
      }),
    },
  ),
)
