import { create } from 'zustand'
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
import { api, apiFetch } from '@/lib/api-client'

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
  connectionsFromBackend: boolean
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
  refresh: () => Promise<void>
}

export const useSellerStore = create<SellerState>()((set, get) => ({
      products: [],
      orders: [],
      movements: [],
      connections: [],
      connectionsFromBackend: false,
      vouchers: [],
      flashSales: [],
      ads: [],
      activeAccountId: 'all',
      setActiveAccount: (id) => set({ activeAccountId: id }),
      fees: {
        marketplacePct: 0,
        affiliatePct: 0,
        shippingPerOrder: 0,
        adsMonthly: 0,
        opexMonthly: 0,
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
        api.seller.createProduct(p).catch(() => {})
      },
      updateProduct: (id, patch) => {
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
        apiFetch(`/seller/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }).catch(() => {})
      },
      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
        apiFetch(`/seller/products/${id}`, { method: 'DELETE' }).catch(() => {})
      },
      restockProduct: (id, qty) => {
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
        })
        apiFetch(`/seller/inventory/${id}/restock`, {
          method: 'POST',
          body: JSON.stringify({ qty }),
        }).catch(() => {})
      },
      updateOrderStatus: (id, status) => {
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) }))
        apiFetch(`/seller/orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }).catch(() => {})
      },
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
        await new Promise((r) => setTimeout(r, 400))
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id
              ? { ...c, status: 'connected', lastSync: new Date().toISOString(), note: undefined }
              : c,
          ),
        }))
        if (!get().connectionsFromBackend) return
        try {
          const updated = (await api.seller.syncMarketplace(id)) as Partial<MarketplaceConnection>
          if (updated?.id) {
            set((s) => ({
              connections: s.connections.map((c) => (c.id === id ? { ...c, ...updated } : c)),
            }))
          }
        } catch {
          // offline / demo connection id: keep optimistic state
        }
      },
      updateFees: (patch) => {
        set((s) => ({ fees: { ...s.fees, ...patch } }))
        apiFetch('/seller/finance/fees', {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }).catch(() => {})
      },
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
        apiFetch('/seller/vouchers', {
          method: 'POST',
          body: JSON.stringify(v),
        }).catch(() => {})
      },
      toggleVoucher: (id) => {
        set((s) => ({
          vouchers: s.vouchers.map((v) =>
            v.id === id && v.status !== 'ended'
              ? { ...v, status: v.status === 'active' ? 'paused' : 'active' }
              : v,
          ),
        }))
        apiFetch(`/seller/vouchers/${id}/toggle`, { method: 'POST' }).catch(() => {})
      },
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
        apiFetch('/seller/flash-sales', {
          method: 'POST',
          body: JSON.stringify(f),
        }).catch(() => {})
      },
      toggleFlashSale: (id) => {
        set((s) => ({
          flashSales: s.flashSales.map((f) =>
            f.id === id && f.status !== 'ended'
              ? { ...f, status: f.status === 'active' ? 'paused' : 'active' }
              : f,
          ),
        }))
        apiFetch(`/seller/flash-sales/${id}/toggle`, { method: 'POST' }).catch(() => {})
      },
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
        apiFetch('/seller/ad-campaigns', {
          method: 'POST',
          body: JSON.stringify(a),
        }).catch(() => {})
      },
      toggleAdCampaign: (id) => {
        set((s) => ({
          ads: s.ads.map((a) =>
            a.id === id && a.status !== 'ended'
              ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
              : a,
          ),
        }))
        apiFetch(`/seller/ad-campaigns/${id}/toggle`, { method: 'POST' }).catch(() => {})
      },
      addAdBudget: (id, amount) => {
        set((s) => ({
          ads: s.ads.map((a) => (a.id === id ? { ...a, budget: a.budget + amount } : a)),
        }))
        apiFetch(`/seller/ad-campaigns/${id}/budget`, {
          method: 'POST',
          body: JSON.stringify({ amount }),
        }).catch(() => {})
      },
      refresh: async () => {
        try {
          const [productsRes, ordersRes, marketsRes, vouchersRes, flashRes, adsRes, financeRes] =
            await Promise.all([
              api.seller.listProducts(),
              api.seller.listOrders({ limit: '200' }),
              api.seller.listMarketplaces(),
              api.seller.listVouchers(),
              api.seller.listFlashSales(),
              api.seller.listAdCampaigns(),
              api.seller.getFinance(),
            ])
          const connections = (marketsRes.items as MarketplaceConnection[]).map((c) => ({
            ...c,
            lastSync: c.lastSync ?? '',
          }))
          set({
            products: productsRes.items as Product[],
            orders: ordersRes.items as Order[],
            connections,
            connectionsFromBackend: true,
            vouchers: Array.isArray(vouchersRes) ? (vouchersRes as Voucher[]) : [],
            flashSales: Array.isArray(flashRes) ? (flashRes as FlashSale[]) : [],
            ads: Array.isArray(adsRes) ? (adsRes as AdCampaign[]) : [],
            ...(financeRes?.fees ? { fees: financeRes.fees as FeeConfig } : {}),
          })
        } catch {
          // backend tidak tersedia: biarkan state kosong
        }
      },
}))
