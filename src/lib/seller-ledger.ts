import type {
  AdCampaign,
  FlashSale,
  LedgerEntry,
  LedgerType,
  MarketplaceConnection,
  Order,
  Product,
  Voucher,
} from '@/types'
import { dateOffset, formatDate } from '@/lib/utils'

interface FeeConfigLike {
  marketplacePct: number
  affiliatePct: number
  shippingPerOrder: number
  opexMonthly: number
}

interface BuildLedgerInput {
  orders: Order[]
  products: Product[]
  connections: MarketplaceConnection[]
  vouchers: Voucher[]
  flashSales: FlashSale[]
  ads: AdCampaign[]
  fees: FeeConfigLike
}

export const ledgerTypeMeta: Record<LedgerType, { label: string; tone: 'primary' | 'warning' | 'danger' | 'info' | 'outline'; sign: 1 | -1 }> = {
  income: { label: 'Pemasukan', tone: 'primary', sign: 1 },
  discount: { label: 'Diskon', tone: 'warning', sign: -1 },
  refund: { label: 'Refund', tone: 'danger', sign: -1 },
  platform_fee: { label: 'Fee platform', tone: 'warning', sign: -1 },
  affiliate_fee: { label: 'Fee afiliasi', tone: 'warning', sign: -1 },
  shipping: { label: 'Ongkir', tone: 'info', sign: -1 },
  cogs: { label: 'HPP', tone: 'outline', sign: -1 },
  ads: { label: 'Iklan', tone: 'danger', sign: -1 },
  opex: { label: 'Opex', tone: 'outline', sign: -1 },
}

const settledStatuses: Order['status'][] = ['Completed', 'Shipped']
const nowIso = () => new Date().toISOString()
const safeDate = (value: string, fallback = nowIso()) => {
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time <= Date.now() ? value : fallback
}

export function buildSellerLedger({
  orders,
  products,
  connections,
  vouchers,
  flashSales,
  ads,
  fees,
}: BuildLedgerInput): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  const productByName = new Map(products.map((p) => [p.name, p]))

  for (const order of orders) {
    const base = {
      accountId: order.accountId,
      marketplace: order.marketplace,
      ref: order.id,
    }

    if (order.status === 'Returned') {
      entries.push({
        ...base,
        id: `${order.id}-refund`,
        date: order.date,
        type: 'refund',
        label: `Refund ${order.customer}`,
        detail: `${order.product} · ${order.qty} unit`,
        amount: -order.total,
      })
      continue
    }
    if (!settledStatuses.includes(order.status)) continue

    const product = productByName.get(order.product)
    entries.push({
      ...base,
      id: `${order.id}-income`,
      date: order.date,
      type: 'income',
      label: `Pesanan ${order.customer}`,
      detail: `${order.product} · ${order.qty} unit`,
      amount: order.total,
      productId: product?.id,
    })
    entries.push({
      ...base,
      id: `${order.id}-platform`,
      date: order.date,
      type: 'platform_fee',
      label: 'Fee marketplace',
      detail: `${fees.marketplacePct}% dari ${order.id}`,
      amount: -Math.round((order.total * fees.marketplacePct) / 100),
      productId: product?.id,
    })
    entries.push({
      ...base,
      id: `${order.id}-affiliate`,
      date: order.date,
      type: 'affiliate_fee',
      label: 'Fee afiliasi',
      detail: `${fees.affiliatePct}% dari ${order.id}`,
      amount: -Math.round((order.total * fees.affiliatePct) / 100),
      productId: product?.id,
    })
    entries.push({
      ...base,
      id: `${order.id}-shipping`,
      date: order.date,
      type: 'shipping',
      label: 'Ongkir ditanggung',
      detail: order.id,
      amount: -fees.shippingPerOrder,
      productId: product?.id,
    })
    if (product) {
      entries.push({
        ...base,
        id: `${order.id}-cogs`,
        date: order.date,
        type: 'cogs',
        label: 'HPP barang terjual',
        detail: `${order.qty} unit ${product.sku}`,
        amount: -product.cost * order.qty,
        productId: product.id,
      })
    }
  }

  const totalIncome = entries.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0)

  for (const voucher of vouchers) {
    if (voucher.used <= 0) continue
    const perUse =
      voucher.kind === 'fixed'
        ? voucher.value
        : voucher.kind === 'shipping'
          ? voucher.value
          : Math.max(voucher.minSpend, 150000) * (voucher.value / 100)
    entries.push({
      id: `${voucher.id}-discount`,
      date: safeDate(voucher.endDate),
      accountId: voucher.accountId,
      marketplace: voucher.marketplace,
      type: 'discount',
      label: `Voucher ${voucher.code}`,
      detail: `${voucher.used}x pemakaian · kuota ${voucher.quota}`,
      amount: -Math.round(perUse * voucher.used),
      ref: voucher.id,
    })
  }

  for (const sale of flashSales) {
    if (sale.sold <= 0) continue
    const product = products.find((p) => p.id === sale.productId)
    if (!product) continue
    entries.push({
      id: `${sale.id}-discount`,
      date: safeDate(sale.endDate, safeDate(sale.startDate)),
      accountId: sale.accountId,
      marketplace: sale.marketplace,
      type: 'discount',
      label: `Flash sale ${sale.title}`,
      detail: `${sale.sold}x · diskon ${sale.discountPct}%`,
      amount: -Math.round((product.price * sale.discountPct * sale.sold) / 100),
      productId: product.id,
      ref: sale.id,
    })
  }

  for (const ad of ads) {
    if (ad.spend <= 0) continue
    entries.push({
      id: `${ad.id}-ads`,
      date: safeDate(ad.endDate, safeDate(ad.startDate)),
      accountId: ad.accountId,
      marketplace: ad.marketplace,
      type: 'ads',
      label: ad.name,
      detail: `Spend ${ad.spend.toLocaleString('id-ID')} · ROAS ${(ad.revenue / ad.spend).toFixed(2)}x`,
      amount: -ad.spend,
      ref: ad.id,
    })
  }

  const accountsWithIncome = connections
    .map((c) => ({
      id: c.id,
      income: entries
        .filter((e) => e.accountId === c.id && e.type === 'income')
        .reduce((a, e) => a + e.amount, 0),
    }))
    .filter((a) => a.income > 0)

  for (const account of accountsWithIncome) {
    const connection = connections.find((c) => c.id === account.id)!
    entries.push({
      id: `${account.id}-opex`,
      date: nowIso(),
      accountId: account.id,
      marketplace: connection.name,
      type: 'opex',
      label: 'Alokasi opex bulanan',
      detail: 'Dibagi proporsional dari pemasukan akun',
      amount: -Math.round((fees.opexMonthly * account.income) / Math.max(1, totalIncome)),
    })
  }

  return entries.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export interface LedgerSummary {
  income: number
  discounts: number
  refunds: number
  platformFees: number
  affiliateFees: number
  shipping: number
  cogs: number
  ads: number
  opex: number
  totalCost: number
  net: number
  margin: number
  orders: number
  aov: number
  payout: number
}

const sumType = (entries: LedgerEntry[], type: LedgerType) =>
  entries.filter((e) => e.type === type).reduce((a, e) => a + Math.abs(e.amount), 0)

export function summarizeLedger(entries: LedgerEntry[]): LedgerSummary {
  const income = entries.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0)
  const discounts = sumType(entries, 'discount')
  const refunds = sumType(entries, 'refund')
  const platformFees = sumType(entries, 'platform_fee')
  const affiliateFees = sumType(entries, 'affiliate_fee')
  const shipping = sumType(entries, 'shipping')
  const cogs = sumType(entries, 'cogs')
  const ads = sumType(entries, 'ads')
  const opex = sumType(entries, 'opex')
  const totalCost = discounts + refunds + platformFees + affiliateFees + shipping + cogs + ads + opex
  const net = entries.reduce((a, e) => a + e.amount, 0)
  const orders = entries.filter((e) => e.type === 'income').length
  return {
    income,
    discounts,
    refunds,
    platformFees,
    affiliateFees,
    shipping,
    cogs,
    ads,
    opex,
    totalCost,
    net,
    margin: income > 0 ? (net / income) * 100 : 0,
    orders,
    aov: orders > 0 ? income / orders : 0,
    payout: Math.max(0, net),
  }
}

export function scopeLedger(entries: LedgerEntry[], accountId: string) {
  return accountId === 'all' ? entries : entries.filter((e) => e.accountId === accountId)
}

export function ledgerDailySeries(entries: LedgerEntry[], days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const key = dateOffset(index - days + 1)
    const dayEntries = entries.filter((e) => e.date.slice(0, 10) === key)
    const income = dayEntries.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0)
    const expense = dayEntries.filter((e) => e.amount < 0).reduce((a, e) => a + Math.abs(e.amount), 0)
    return {
      label: formatDate(`${key}T00:00:00`, 'd MMM'),
      income,
      expense,
      net: income - expense,
    }
  })
}

export function ledgerPlatformSeries(entries: LedgerEntry[], days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const key = dateOffset(index - days + 1)
    const dayEntries = entries.filter((e) => e.type === 'income' && e.date.slice(0, 10) === key)
    return {
      label: formatDate(`${key}T00:00:00`, 'd MMM'),
      tiktok: dayEntries.filter((e) => e.marketplace === 'TikTok Shop').reduce((a, e) => a + e.amount, 0),
      shopee: dayEntries.filter((e) => e.marketplace === 'Shopee').reduce((a, e) => a + e.amount, 0),
    }
  })
}

export function ledgerByAccount(entries: LedgerEntry[]) {
  const map = new Map<string, { income: number; cost: number; net: number; entries: number }>()
  for (const entry of entries) {
    const current = map.get(entry.accountId) ?? { income: 0, cost: 0, net: 0, entries: 0 }
    if (entry.amount > 0) current.income += entry.amount
    else current.cost += Math.abs(entry.amount)
    current.net += entry.amount
    current.entries += 1
    map.set(entry.accountId, current)
  }
  return map
}

export function ledgerByProduct(entries: LedgerEntry[]) {
  const map = new Map<string, { net: number; income: number; cost: number }>()
  for (const entry of entries) {
    if (!entry.productId) continue
    const current = map.get(entry.productId) ?? { net: 0, income: 0, cost: 0 }
    if (entry.amount > 0) current.income += entry.amount
    else current.cost += Math.abs(entry.amount)
    current.net += entry.amount
    map.set(entry.productId, current)
  }
  return map
}

export function effectivePrice(product: Product) {
  if (!product.discountPct) return product.price
  return Math.round(product.price * (1 - product.discountPct / 100))
}
