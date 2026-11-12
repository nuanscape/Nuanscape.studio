import type { AssetItem, Budget, ContentItem, Goal, LiabilityItem, Product, Transaction } from '@/types'

export function financeSummary(transactions: Transaction[], assets: AssetItem[], liabilities: LiabilityItem[]) {
  const income = transactions.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const net = income - expense
  const savingsRate = income > 0 ? (net / income) * 100 : 0
  const assetTotal = assets.reduce((a, x) => a + x.value, 0)
  const liabilityTotal = liabilities.reduce((a, x) => a + x.value, 0)
  return {
    income,
    expense,
    net,
    savingsRate,
    balance: assetTotal - liabilityTotal,
    assetTotal,
    liabilityTotal,
    netWorth: assetTotal - liabilityTotal,
  }
}

export function categoryTotals(transactions: Transaction[], type: 'income' | 'expense') {
  const map = new Map<string, number>()
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function budgetSummary(budgets: Budget[]) {
  const limit = budgets.reduce((a, b) => a + b.limit, 0)
  const spent = budgets.reduce((a, b) => a + b.spent, 0)
  return { limit, spent, remaining: limit - spent, usage: limit ? (spent / limit) * 100 : 0 }
}

export function goalSummary(goals: Goal[]) {
  const target = goals.reduce((a, g) => a + g.target, 0)
  const saved = goals.reduce((a, g) => a + g.saved, 0)
  return { target, saved, progress: target ? (saved / target) * 100 : 0 }
}

export const SHOP_REVENUE_30D = 65_480_000
export const SHOP_COGS_30D = 31_200_000
export const SHOP_DISCOUNTS = 1_920_000
export const SHOP_REFUNDS = 980_000
export const SHOP_SHIPPING = 2_620_000
export const SHOP_OPEX = 2_400_000
export const SHOP_ORDER_COUNT = 1050

export function shopMetrics(products: Product[], fees: { marketplacePct: number; affiliatePct: number; shippingPerOrder: number; adsMonthly: number; opexMonthly: number }) {
  const grossRevenue = SHOP_REVENUE_30D
  const netSales = grossRevenue - SHOP_DISCOUNTS - SHOP_REFUNDS
  const cogs = SHOP_COGS_30D
  const grossProfit = netSales - cogs
  const marketplaceFees = (netSales * (fees.marketplacePct + fees.affiliatePct)) / 100
  const shipping = fees.shippingPerOrder * SHOP_ORDER_COUNT
  const netProfit = grossProfit - marketplaceFees - shipping - fees.adsMonthly - fees.opexMonthly
  const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0
  const inventoryValue = products.reduce((a, p) => a + p.cost * p.stock, 0)
  const inventoryUnits = products.reduce((a, p) => a + p.stock, 0)
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const outOfStock = products.filter((p) => p.stock === 0)
  return {
    grossRevenue,
    netSales,
    cogs,
    grossProfit,
    marketplaceFees,
    shipping,
    ads: fees.adsMonthly,
    opex: fees.opexMonthly,
    netProfit,
    margin,
    inventoryValue,
    inventoryUnits,
    lowStock,
    outOfStock,
    orders: SHOP_ORDER_COUNT,
    aov: netSales / SHOP_ORDER_COUNT,
    discounts: SHOP_DISCOUNTS,
    refunds: SHOP_REFUNDS,
  }
}

export function productMargin(product: Product) {
  const gross = product.price - product.cost
  return { gross, pct: product.price > 0 ? (gross / product.price) * 100 : 0 }
}

export function contentSummary(items: ContentItem[]) {
  const published = items.filter((i) => i.status === 'Published')
  const views = published.reduce((a, i) => a + i.views, 0)
  const engagement = published.length
    ? published.reduce((a, i) => a + i.engagement, 0) / published.length
    : 0
  const inProduction = items.filter((i) =>
    ['Production', 'Editing', 'Review', 'Script Ready', 'Draft'].includes(i.status),
  ).length
  return { published: published.length, views, engagement, inProduction, total: items.length }
}

export function profitWaterfall(products: Product[], fees: { marketplacePct: number; affiliatePct: number; shippingPerOrder: number; adsMonthly: number; opexMonthly: number }) {
  const m = shopMetrics(products, fees)
  return [
    { name: 'Gross Revenue', value: m.grossRevenue, type: 'total' },
    { name: 'Diskon', value: -m.discounts, type: 'negative' },
    { name: 'Refund', value: -m.refunds, type: 'negative' },
    { name: 'COGS', value: -m.cogs, type: 'negative' },
    { name: 'Gross Profit', value: m.grossProfit, type: 'total' },
    { name: 'Fee Marketplace', value: -Math.round(m.marketplaceFees), type: 'negative' },
    { name: 'Shipping', value: -Math.round(m.shipping), type: 'negative' },
    { name: 'Ads', value: -m.ads, type: 'negative' },
    { name: 'Opex', value: -m.opex, type: 'negative' },
    { name: 'Net Profit', value: Math.round(m.netProfit), type: 'total' },
  ]
}
