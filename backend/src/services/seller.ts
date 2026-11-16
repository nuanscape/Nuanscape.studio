import { randomBytes } from 'node:crypto'
import type {
  InventoryMovement as MovementModel,
  MarketplaceConnection as ConnectionModel,
  MarketplaceName,
  Order as OrderModel,
  OrderStatus,
  Prisma,
  Product as ProductModel,
  ProductMarketplace,
  ProductStatus,
  SellerDailySnapshot,
  SellerSetting,
  StockMovementType,
  SellerVoucher as VoucherModel,
  SellerFlashSale as FlashSaleModel,
  SellerAdCampaign as AdCampaignModel,
  LedgerType,
} from '@prisma/client'
import { conflict, notFound } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'

const DAY_MS = 86_400_000
const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Completed']
const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['Cancelled', 'Returned']

const MARKETPLACE_COLORS: Record<'TikTok Shop' | 'Shopee', string> = {
  'TikTok Shop': '#F5D64B',
  Shopee: '#FFD166',
}

type ApiMarketplace = 'TikTok Shop' | 'Shopee'
type ApiProductMarketplace = 'TikTok Shop' | 'Shopee' | 'Both'
type ApiProductStatus = 'Active' | 'Paused' | 'Out of Stock'

export interface ProductFilters {
  q?: string
  status?: ApiProductStatus
  category?: string
  marketplace?: ApiProductMarketplace
  stock?: 'low' | 'out' | 'active'
  accountId?: string
}

export interface OrderFilters {
  status?: OrderStatus
  marketplace?: ApiMarketplace
  accountId?: string
  q?: string
  limit: number
  offset: number
}

export interface CreateProductInput {
  sku: string
  name: string
  category: string
  price: number
  cost: number
  stock?: number
  minStock?: number
  marketplace?: ApiProductMarketplace
  accountIds?: string[]
  discountPct?: number
  status?: ApiProductStatus
  seoScore?: number
  geoScore?: number
}

export interface UpdateProductInput {
  sku?: string
  name?: string
  category?: string
  price?: number
  cost?: number
  stock?: number
  minStock?: number
  marketplace?: ApiProductMarketplace
  accountIds?: string[]
  discountPct?: number
  status?: ApiProductStatus
  seoScore?: number
  geoScore?: number
}

export interface CreateOrderInput {
  productId: string
  customer: string
  qty: number
  marketplace: ApiMarketplace
  accountId?: string
  status?: OrderStatus
  date?: string
}

export interface CreateVoucherInput {
  code: string
  title: string
  accountId?: string
  marketplace: ApiMarketplace
  kind: 'percent' | 'fixed' | 'shipping'
  value: number
  minSpend?: number
  quota?: number
  startDate?: string
  endDate: string
}

export interface CreateFlashSaleInput {
  title: string
  accountId?: string
  marketplace: ApiMarketplace
  productId: string
  discountPct: number
  quota: number
  startDate?: string
  endDate: string
}

export interface CreateAdCampaignInput {
  name: string
  accountId?: string
  marketplace: ApiMarketplace
  objective?: 'Sales' | 'Traffic' | 'Live'
  budget: number
  startDate?: string
  endDate: string
}

export interface FeeInput {
  marketplacePct?: number
  affiliatePct?: number
  shippingPerOrder?: number
  adsMonthly?: number
  opexMonthly?: number
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function todayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function lastDayKeys(count: number): string[] {
  const [year, month, day] = todayJakarta().split('-').map(Number)
  const base = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  const keys: string[] = []
  for (let index = count - 1; index >= 0; index -= 1) {
    keys.push(new Date(base - index * DAY_MS).toISOString().slice(0, 10))
  }
  return keys
}

function weekdayLabel(key: string): string {
  return new Date(`${key}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function marketplaceToDb(value: ApiMarketplace): MarketplaceName {
  return value === 'TikTok Shop' ? 'TikTokShop' : 'Shopee'
}

function marketplaceFromDb(value: MarketplaceName): ApiMarketplace {
  return value === 'TikTokShop' ? 'TikTok Shop' : 'Shopee'
}

function productMarketplaceToDb(value: ApiProductMarketplace): ProductMarketplace {
  if (value === 'Both') return 'Both'
  return value === 'TikTok Shop' ? 'TikTokShop' : 'Shopee'
}

function productMarketplaceFromDb(value: ProductMarketplace): ApiProductMarketplace {
  if (value === 'Both') return 'Both'
  return value === 'TikTokShop' ? 'TikTok Shop' : 'Shopee'
}

function productStatusToDb(value: ApiProductStatus): ProductStatus {
  if (value === 'Out of Stock') return 'OutOfStock'
  return value === 'Paused' ? 'Paused' : 'Active'
}

function productStatusFromDb(value: ProductStatus): ApiProductStatus {
  if (value === 'OutOfStock') return 'Out of Stock'
  return value === 'Paused' ? 'Paused' : 'Active'
}

function movementTypeFromDb(value: StockMovementType): 'in' | 'out' | 'damaged' | 'reserved' {
  if (value === 'In') return 'in'
  if (value === 'Out') return 'out'
  if (value === 'Damaged') return 'damaged'
  return 'reserved'
}

function mapProduct(product: ProductModel) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    minStock: product.minStock,
    sold: product.sold,
    marketplace: productMarketplaceFromDb(product.marketplace),
    accountIds: product.accountIds,
    discountPct: product.discountPct,
    seoScore: product.seoScore,
    geoScore: product.geoScore,
    status: productStatusFromDb(product.status),
    createdAt: product.createdAt.toISOString(),
  }
}

function mapMovement(movement: MovementModel & { product?: Pick<ProductModel, 'name'> | null }) {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.product?.name ?? null,
    type: movementTypeFromDb(movement.type),
    qty: movement.qty,
    note: movement.note,
    date: movement.date.toISOString(),
  }
}

function mapOrder(order: OrderModel) {
  return {
    id: order.id,
    productId: order.productId,
    customer: order.customer,
    product: order.productName,
    qty: order.qty,
    total: order.total,
    status: order.status,
    marketplace: marketplaceFromDb(order.marketplace),
    accountId: order.accountId,
    date: order.date.toISOString(),
  }
}

function mapVoucher(v: VoucherModel) {
  return {
    id: v.id,
    code: v.code,
    title: v.title,
    accountId: v.accountId,
    marketplace: marketplaceFromDb(v.marketplace),
    kind: v.kind,
    value: v.value,
    minSpend: v.minSpend,
    quota: v.quota,
    used: v.used,
    startDate: v.startDate.toISOString().slice(0, 10),
    endDate: v.endDate.toISOString().slice(0, 10),
    status: v.status,
    createdAt: v.createdAt.toISOString(),
  }
}

function mapFlashSale(
  f: FlashSaleModel & { product?: Pick<ProductModel, 'name' | 'price' | 'sku'> | null },
) {
  return {
    id: f.id,
    title: f.title,
    accountId: f.accountId,
    marketplace: marketplaceFromDb(f.marketplace),
    productId: f.productId ?? '',
    productName: f.product?.name ?? null,
    discountPct: f.discountPct,
    quota: f.quota,
    sold: f.sold,
    startDate: f.startDate.toISOString().slice(0, 10),
    endDate: f.endDate.toISOString().slice(0, 10),
    status: f.status,
    createdAt: f.createdAt.toISOString(),
  }
}

function mapAdCampaign(a: AdCampaignModel) {
  return {
    id: a.id,
    name: a.name,
    accountId: a.accountId,
    marketplace: marketplaceFromDb(a.marketplace),
    objective: a.objective as 'Sales' | 'Traffic' | 'Live',
    budget: a.budget,
    spend: a.spend,
    revenue: a.revenue,
    impressions: a.impressions,
    clicks: a.clicks,
    conversions: a.conversions,
    startDate: a.startDate.toISOString().slice(0, 10),
    endDate: a.endDate.toISOString().slice(0, 10),
    status: a.status,
    roas: a.spend > 0 ? round(a.revenue / a.spend, 2) : 0,
    createdAt: a.createdAt.toISOString(),
  }
}

function mapConnection(connection: ConnectionModel) {
  return {
    id: connection.id,
    name: marketplaceFromDb(connection.name),
    storeName: connection.storeName,
    status: connection.status,
    lastSync: connection.lastSync?.toISOString() ?? null,
    permissions: connection.permissions,
    ...(connection.note ? { note: connection.note } : {}),
  }
}

async function getSetting(ownerId: string): Promise<SellerSetting> {
  return prisma.sellerSetting.upsert({
    where: { ownerId },
    create: { ownerId },
    update: {},
  })
}

async function getProductsForMetrics(ownerId: string): Promise<ProductModel[]> {
  return prisma.product.findMany({ where: { ownerId } })
}

async function getDeltaOrders(ownerId: string): Promise<OrderModel[]> {
  return prisma.order.findMany({
    where: {
      ownerId,
      includedInBaseline: false,
      status: { in: ACTIVE_ORDER_STATUSES },
    },
  })
}

function buildMetrics(setting: SellerSetting, products: ProductModel[], deltas: OrderModel[]) {
  const deltaRevenue = sum(deltas.map((order) => order.total))
  const deltaCogs = sum(deltas.map((order) => order.unitCost * order.qty))
  const grossRevenue = setting.grossRevenue30d + deltaRevenue
  const cogs = setting.cogs30d + deltaCogs
  const netSales = grossRevenue - setting.discounts30d - setting.refunds30d
  const grossProfit = netSales - cogs
  const orderCount = setting.orderCount30d + deltas.length
  const marketplaceFees = (netSales * (setting.marketplacePct + setting.affiliatePct)) / 100
  const shipping = setting.shippingPerOrder * orderCount
  const netProfit = grossProfit - marketplaceFees - shipping - setting.adsMonthly - setting.opexMonthly
  const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0
  const inventoryValue = sum(products.map((product) => product.cost * product.stock))
  const inventoryUnits = sum(products.map((product) => product.stock))
  const lowStock = products.filter(
    (product) => product.stock > 0 && product.stock <= product.minStock,
  )
  const outOfStock = products.filter((product) => product.stock === 0)

  return {
    grossRevenue,
    netSales,
    cogs,
    grossProfit,
    marketplaceFees: round(marketplaceFees),
    shipping,
    ads: setting.adsMonthly,
    opex: setting.opexMonthly,
    netProfit: round(netProfit),
    margin: round(margin),
    inventoryValue,
    inventoryUnits,
    orders: orderCount,
    aov: orderCount > 0 ? round(netSales / orderCount) : 0,
    discounts: setting.discounts30d,
    refunds: setting.refunds30d,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    productCount: products.length,
  }
}

function buildWaterfall(metrics: ReturnType<typeof buildMetrics>) {
  return [
    { name: 'Gross Revenue', value: metrics.grossRevenue, type: 'total' },
    { name: 'Diskon', value: -metrics.discounts, type: 'negative' },
    { name: 'Refund', value: -metrics.refunds, type: 'negative' },
    { name: 'COGS', value: -metrics.cogs, type: 'negative' },
    { name: 'Gross Profit', value: metrics.grossProfit, type: 'total' },
    { name: 'Fee Marketplace', value: -Math.round(metrics.marketplaceFees), type: 'negative' },
    { name: 'Shipping', value: -Math.round(metrics.shipping), type: 'negative' },
    { name: 'Ads', value: -metrics.ads, type: 'negative' },
    { name: 'Opex', value: -metrics.opex, type: 'negative' },
    { name: 'Net Profit', value: Math.round(metrics.netProfit), type: 'total' },
  ]
}

function buildMarketplaces(setting: SellerSetting, deltas: OrderModel[]) {
  const tiktokRevenue =
    setting.tiktokRevenue30d +
    sum(deltas.filter((order) => order.marketplace === 'TikTokShop').map((order) => order.total))
  const shopeeRevenue =
    setting.shopeeRevenue30d +
    sum(deltas.filter((order) => order.marketplace === 'Shopee').map((order) => order.total))
  const tiktokOrders =
    setting.tiktokOrders30d + deltas.filter((order) => order.marketplace === 'TikTokShop').length
  const shopeeOrders =
    setting.shopeeOrders30d + deltas.filter((order) => order.marketplace === 'Shopee').length
  const totalRevenue = tiktokRevenue + shopeeRevenue

  return [
    {
      name: 'TikTok Shop' as const,
      revenue: tiktokRevenue,
      orders: tiktokOrders,
      share: totalRevenue > 0 ? Math.round((tiktokRevenue / totalRevenue) * 100) : 0,
      aov: tiktokOrders > 0 ? Math.round(tiktokRevenue / tiktokOrders) : 0,
      color: MARKETPLACE_COLORS['TikTok Shop'],
    },
    {
      name: 'Shopee' as const,
      revenue: shopeeRevenue,
      orders: shopeeOrders,
      share: totalRevenue > 0 ? Math.round((shopeeRevenue / totalRevenue) * 100) : 0,
      aov: shopeeOrders > 0 ? Math.round(shopeeRevenue / shopeeOrders) : 0,
      color: MARKETPLACE_COLORS.Shopee,
    },
  ]
}

function buildProfitByProduct(setting: SellerSetting, products: ProductModel[]) {
  const feePct = setting.marketplacePct + setting.affiliatePct
  return products
    .map((product) => {
      const revenue = product.price * product.sold
      const fee = (revenue * feePct) / 100
      const net = revenue - fee - product.cost * product.sold
      return {
        product: mapProduct(product),
        revenue,
        fee: round(fee),
        net: round(net),
        marginPct: revenue > 0 ? round((net / revenue) * 100) : 0,
      }
    })
    .sort((a, b) => b.net - a.net)
}

function buildSeries(
  snapshots: SellerDailySnapshot[],
  deltas: OrderModel[],
): Array<{ label: string; date: string; tiktok: number; shopee: number }> {
  const keys = lastDayKeys(7)
  return keys.map((key) => {
    const snapshot = snapshots.find((row) => dateKey(row.date) === key)
    const dayOrders = deltas.filter((order) => dateKey(order.date) === key)
    return {
      label: weekdayLabel(key),
      date: key,
      tiktok:
        (snapshot?.tiktok ?? 0) +
        sum(dayOrders.filter((order) => order.marketplace === 'TikTokShop').map((order) => order.total)),
      shopee:
        (snapshot?.shopee ?? 0) +
        sum(dayOrders.filter((order) => order.marketplace === 'Shopee').map((order) => order.total)),
    }
  })
}

function buildInsights(
  metrics: ReturnType<typeof buildMetrics>,
  marketplaces: ReturnType<typeof buildMarketplaces>,
  products: ProductModel[],
  setting: SellerSetting,
) {
  const insights: Array<{
    id: string
    title: string
    detail: string
    why: string
    tone: 'positive' | 'warning' | 'neutral' | 'danger'
    action?: string
  }> = []
  const ranked = buildProfitByProduct(setting, products)
  const top = ranked[0]
  const outOfStock = products.find((product) => product.stock === 0)
  const first = marketplaces[0]
  const second = marketplaces[1]
  const leader = first && second ? (first.revenue >= second.revenue ? first : second) : first
  const other = leader?.name === 'TikTok Shop' ? second : first

  if (top && top.product.sold > 0) {
    insights.push({
      id: 'si-profit',
      title: `${top.product.name} margin tertinggi`,
      detail: `Margin bersih ${round(top.marginPct)}% setelah fee dan HPP. Kontribusi net profit ${metrics.netProfit > 0 ? round((top.net / metrics.netProfit) * 100) : 0}%.`,
      why: 'Net profit = net sales - HPP - fee marketplace - shipping - ads. Fee memakai konfigurasi saat ini.',
      tone: top.net >= 0 ? 'positive' : 'danger',
      action: 'Lihat profit',
    })
  }

  if (outOfStock) {
    insights.push({
      id: 'si-stock',
      title: `${outOfStock.name} stok habis`,
      detail: `${outOfStock.sold} unit terjual, stok 0. Estimasi kehilangan penjualan Rp${Math.round((outOfStock.price * outOfStock.sold) / 4).toLocaleString('id-ID')}/minggu.`,
      why: 'Estimasi dari rata-rata penjualan 30 hari × harga jual. Bukan angka pasti.',
      tone: 'danger',
      action: 'Restock',
    })
  }

  if (leader && other && other.revenue > 0) {
    const gap = round(((leader.revenue - other.revenue) / other.revenue) * 100)
    insights.push({
      id: 'si-marketplace',
      title: `${leader.name} unggul ${gap}%`,
      detail: `Revenue ${leader.name} Rp${leader.revenue.toLocaleString('id-ID')} vs ${other.name} Rp${other.revenue.toLocaleString('id-ID')}, dengan AOV Rp${Math.abs(leader.aov - other.aov).toLocaleString('id-ID')} ${leader.aov >= other.aov ? 'lebih tinggi' : 'lebih rendah'}.`,
      why: 'Periode 30 hari terakhir, berdasarkan order tersinkron dari kedua marketplace.',
      tone: 'neutral',
      action: 'Bandingkan',
    })
  }

  if (metrics.lowStockCount > 0) {
    insights.push({
      id: 'si-low',
      title: `${metrics.lowStockCount} produk di bawah minimum`,
      detail: `Nilai inventory Rp${metrics.inventoryValue.toLocaleString('id-ID')} untuk ${metrics.inventoryUnits} unit.`,
      why: 'Stok rendah dihitung dari stok > 0 dan stok <= minimum stok per produk.',
      tone: 'warning',
      action: 'Lihat inventory',
    })
  }

  return insights
}

function inventorySummary(products: ProductModel[]) {
  const low = products.filter((product) => product.stock > 0 && product.stock <= product.minStock)
  const out = products.filter((product) => product.stock === 0)
  return {
    products: products.length,
    sku: products.length,
    units: sum(products.map((product) => product.stock)),
    value: sum(products.map((product) => product.cost * product.stock)),
    low: low.length,
    out: out.length,
  }
}

function productWhere(ownerId: string, filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ownerId }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { sku: { contains: filters.q, mode: 'insensitive' } },
      { category: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  if (filters.status) where.status = productStatusToDb(filters.status)
  if (filters.category) where.category = filters.category
  if (filters.marketplace) where.marketplace = productMarketplaceToDb(filters.marketplace)
  if (filters.accountId && filters.accountId !== 'all') {
    where.accountIds = { has: filters.accountId }
  }
  if (filters.stock === 'low') {
    where.stock = { gt: 0 }
    where.AND = [{ stock: { lte: prisma.product.fields.minStock } }]
  }
  if (filters.stock === 'out') where.stock = 0
  if (filters.stock === 'active') where.status = 'Active'
  return where
}

export async function listProducts(ownerId: string, filters: ProductFilters) {
  const where = productWhere(ownerId, filters)
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })
  const all = filters.q || filters.status || filters.category || filters.marketplace || filters.stock || filters.accountId
    ? await getProductsForMetrics(ownerId)
    : products
  return {
    items: products.map(mapProduct),
    total: products.length,
    summary: inventorySummary(all),
  }
}

export async function getProduct(ownerId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, ownerId } })
  if (!product) throw notFound('Produk tidak ditemukan.')
  return mapProduct(product)
}

async function assertSkuAvailable(ownerId: string, sku: string, exceptId?: string) {
  const existing = await prisma.product.findFirst({
    where: { ownerId, sku, ...(exceptId ? { id: { not: exceptId } } : {}) },
  })
  if (existing) throw conflict('SKU_TAKEN', 'SKU sudah dipakai produk lain.')
}

export async function createProduct(ownerId: string, input: CreateProductInput) {
  await assertSkuAvailable(ownerId, input.sku)
  const stock = input.stock ?? 0
  const requestedStatus = input.status ? productStatusToDb(input.status) : 'Active'
  const status: ProductStatus = stock === 0 && requestedStatus === 'Active' ? 'OutOfStock' : requestedStatus

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ownerId,
        sku: input.sku,
        name: input.name,
        category: input.category,
        price: input.price,
        cost: input.cost,
        stock,
        minStock: input.minStock ?? 0,
        marketplace: productMarketplaceToDb(input.marketplace ?? 'Both'),
        accountIds: input.accountIds ?? [],
        discountPct: input.discountPct ?? 0,
        status,
        seoScore: input.seoScore ?? 0,
        geoScore: input.geoScore ?? 0,
      },
    })
    if (stock > 0) {
      await tx.inventoryMovement.create({
        data: {
          ownerId,
          productId: created.id,
          type: 'In',
          qty: stock,
          note: 'Stok awal produk',
        },
      })
    }
    return created
  })

  return mapProduct(product)
}

export async function updateProduct(ownerId: string, id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Produk tidak ditemukan.')
  if (input.sku !== undefined) await assertSkuAvailable(ownerId, input.sku, id)

  const nextStock = input.stock ?? existing.stock
  const requestedStatus = input.status
    ? productStatusToDb(input.status)
    : existing.status === 'OutOfStock' && nextStock > 0
      ? 'Active'
      : existing.status
  const status: ProductStatus =
    nextStock === 0 && requestedStatus === 'Active' ? 'OutOfStock' : requestedStatus

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.cost !== undefined ? { cost: input.cost } : {}),
        ...(input.stock !== undefined ? { stock: input.stock } : {}),
        ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
        ...(input.marketplace !== undefined
          ? { marketplace: productMarketplaceToDb(input.marketplace) }
          : {}),
        ...(input.accountIds !== undefined ? { accountIds: input.accountIds } : {}),
        ...(input.discountPct !== undefined ? { discountPct: input.discountPct } : {}),
        ...(input.seoScore !== undefined ? { seoScore: input.seoScore } : {}),
        ...(input.geoScore !== undefined ? { geoScore: input.geoScore } : {}),
        status,
      },
    })
    const delta = updated.stock - existing.stock
    if (delta !== 0) {
      await tx.inventoryMovement.create({
        data: {
          ownerId,
          productId: id,
          type: delta > 0 ? 'In' : 'Out',
          qty: Math.abs(delta),
          note: 'Penyesuaian stok manual',
        },
      })
    }
    return updated
  })

  return mapProduct(product)
}

export async function deleteProduct(ownerId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, ownerId } })
  if (!product) throw notFound('Produk tidak ditemukan.')
  await prisma.product.delete({ where: { id } })
  return { ok: true }
}

export async function restockProduct(ownerId: string, id: string, qty: number, note?: string) {
  const existing = await prisma.product.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Produk tidak ditemukan.')

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: {
        stock: { increment: qty },
        ...(existing.status === 'OutOfStock' ? { status: 'Active' } : {}),
      },
    })
    const movement = await tx.inventoryMovement.create({
      data: {
        ownerId,
        productId: id,
        type: 'In',
        qty,
        note: note?.trim() || `Restock manual — ${product.name}`,
      },
    })
    return { product, movement }
  })

  return {
    product: mapProduct(result.product),
    movement: mapMovement(result.movement),
    summary: inventorySummary(await getProductsForMetrics(ownerId)),
  }
}

export async function getInventory(ownerId: string, movementLimit = 30) {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({ where: { ownerId }, orderBy: { createdAt: 'asc' } }),
    prisma.inventoryMovement.findMany({
      where: { ownerId },
      include: { product: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: movementLimit,
    }),
  ])

  return {
    summary: inventorySummary(products),
    items: products.map(mapProduct),
    lowStock: products
      .filter((product) => product.stock > 0 && product.stock <= product.minStock)
      .map(mapProduct),
    outOfStock: products.filter((product) => product.stock === 0).map(mapProduct),
    movements: movements.map(mapMovement),
  }
}

export async function getOverview(ownerId: string) {
  const [setting, products, deltas, snapshots, connections, recentOrders] = await Promise.all([
    getSetting(ownerId),
    getProductsForMetrics(ownerId),
    getDeltaOrders(ownerId),
    prisma.sellerDailySnapshot.findMany({ where: { ownerId } }),
    prisma.marketplaceConnection.findMany({ where: { ownerId }, orderBy: { name: 'asc' } }),
    prisma.order.findMany({ where: { ownerId }, orderBy: { date: 'desc' }, take: 6 }),
  ])

  const metrics = buildMetrics(setting, products, deltas)
  const marketplaces = buildMarketplaces(setting, deltas)
  const critical = [...products]
    .filter((product) => product.stock === 0 || product.stock <= product.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)

  return {
    metrics,
    waterfall: buildWaterfall(metrics),
    series: buildSeries(snapshots, deltas),
    marketplaces,
    connections: connections.map(mapConnection),
    recentOrders: recentOrders.map(mapOrder),
    criticalStock: critical.map(mapProduct),
    insights: buildInsights(metrics, marketplaces, products, setting),
  }
}

export async function getFinance(ownerId: string) {
  const [setting, products, deltas, snapshots] = await Promise.all([
    getSetting(ownerId),
    getProductsForMetrics(ownerId),
    getDeltaOrders(ownerId),
    prisma.sellerDailySnapshot.findMany({ where: { ownerId } }),
  ])
  const metrics = buildMetrics(setting, products, deltas)

  return {
    fees: {
      marketplacePct: setting.marketplacePct,
      affiliatePct: setting.affiliatePct,
      shippingPerOrder: setting.shippingPerOrder,
      adsMonthly: setting.adsMonthly,
      opexMonthly: setting.opexMonthly,
    },
    metrics,
    waterfall: buildWaterfall(metrics),
    series: buildSeries(snapshots, deltas),
    profitByProduct: buildProfitByProduct(setting, products),
  }
}

export async function updateFees(ownerId: string, input: FeeInput) {
  await getSetting(ownerId)
  const updated = await prisma.sellerSetting.update({
    where: { ownerId },
    data: {
      ...(input.marketplacePct !== undefined ? { marketplacePct: input.marketplacePct } : {}),
      ...(input.affiliatePct !== undefined ? { affiliatePct: input.affiliatePct } : {}),
      ...(input.shippingPerOrder !== undefined ? { shippingPerOrder: input.shippingPerOrder } : {}),
      ...(input.adsMonthly !== undefined ? { adsMonthly: input.adsMonthly } : {}),
      ...(input.opexMonthly !== undefined ? { opexMonthly: input.opexMonthly } : {}),
    },
  })
  return getFinance(updated.ownerId)
}

export async function getSeo(ownerId: string) {
  const products = await prisma.product.findMany({
    where: { ownerId },
    orderBy: [{ seoScore: 'asc' }, { createdAt: 'asc' }],
  })
  const avgSeo = products.length
    ? products.reduce((total, product) => total + product.seoScore, 0) / products.length
    : 0
  const avgGeo = products.length
    ? products.reduce((total, product) => total + product.geoScore, 0) / products.length
    : 0
  const below = products.filter((product) => product.seoScore < 70)

  return {
    summary: {
      avgSeo: Math.round(avgSeo),
      avgGeo: Math.round(avgGeo),
      below: below.length,
      analyzed: products.length,
    },
    items: products.map((product) => ({
      ...mapProduct(product),
      titleSuggestion: `${product.name} ${product.category} Premium | ${
        product.marketplace === 'Both'
          ? 'TikTok Seller & Shopee'
          : productMarketplaceFromDb(product.marketplace)
      }`,
      checklist: [
        { label: 'Judul memuat kata kunci utama', done: product.seoScore >= 70 },
        { label: 'Deskripsi menjawab kebutuhan pembeli', done: product.seoScore >= 75 },
        { label: 'Atribut produk lengkap', done: product.geoScore >= 70 },
        { label: 'Gambar utama jelas dan konsisten', done: product.seoScore >= 65 },
        { label: 'Harga kompetitif di kategori', done: product.geoScore >= 60 },
        { label: 'Ulasan dan rating cukup', done: product.geoScore >= 75 },
      ],
    })),
  }
}

function verdictFor(product: ProductModel, marginPct: number, velocity: number, net: number) {
  if (product.stock === 0) return { label: 'Restock segera', tone: 'danger' as const }
  if (velocity < 10 && marginPct >= 15) return { label: 'Stok tipis', tone: 'warning' as const }
  if (marginPct >= 25) return { label: 'Perlu ditingkatkan', tone: 'primary' as const }
  if (net < 0) return { label: 'Evaluasi harga', tone: 'danger' as const }
  if (marginPct < 15) return { label: 'Margin rendah', tone: 'warning' as const }
  return { label: 'Sehat', tone: 'primary' as const }
}

export async function getIntelligence(ownerId: string) {
  const [setting, products, deltas] = await Promise.all([
    getSetting(ownerId),
    getProductsForMetrics(ownerId),
    getDeltaOrders(ownerId),
  ])
  const metrics = buildMetrics(setting, products, deltas)
  const marketplaces = buildMarketplaces(setting, deltas)
  const ranked = buildProfitByProduct(setting, products).map((entry) => {
    const velocity =
      entry.product.sold > 0 ? entry.product.stock / (entry.product.sold / 30) : 999
    return {
      ...entry,
      velocity: round(velocity),
      verdict: verdictFor(
        products.find((product) => product.id === entry.product.id) as ProductModel,
        entry.marginPct,
        velocity,
        entry.net,
      ),
    }
  })
  const atRisk = products.filter(
    (product) => product.stock === 0 || product.stock <= product.minStock,
  )

  return {
    summary: {
      netProfit: metrics.netProfit,
      bestProduct: ranked[0]?.product.name ?? null,
      atRiskCount: atRisk.length,
      analyzed: products.length,
    },
    ranked,
    signals: buildInsights(metrics, marketplaces, products, setting),
    atRisk: atRisk.map(mapProduct),
  }
}

function orderWhere(ownerId: string, filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { ownerId }
  if (filters.status) where.status = filters.status
  if (filters.marketplace) where.marketplace = marketplaceToDb(filters.marketplace)
  if (filters.accountId && filters.accountId !== 'all') where.accountId = filters.accountId
  if (filters.q) {
    where.OR = [
      { id: { contains: filters.q, mode: 'insensitive' } },
      { customer: { contains: filters.q, mode: 'insensitive' } },
      { productName: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  return where
}

export async function listOrders(ownerId: string, filters: OrderFilters) {
  const where = orderWhere(ownerId, filters)
  const [items, total, groups, revenueRows] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: filters.offset,
      take: filters.limit,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.order.findMany({
      where: { AND: [where, { status: { in: ACTIVE_ORDER_STATUSES } }] },
      select: { total: true },
    }),
  ])

  return {
    items: items.map(mapOrder),
    total,
    summary: {
      count: total,
      revenue: sum(revenueRows.map((row) => row.total)),
      byStatus: Object.fromEntries(groups.map((group) => [group.status, group._count._all])),
    },
  }
}

export async function getOrder(ownerId: string, id: string) {
  const order = await prisma.order.findFirst({ where: { id, ownerId } })
  if (!order) throw notFound('Pesanan tidak ditemukan.')
  return mapOrder(order)
}

function generateOrderId(marketplace: ApiMarketplace): string {
  const prefix = marketplace === 'TikTok Shop' ? 'SO' : 'SP'
  const stamp = todayJakarta().slice(2, 7).replace('-', '')
  const suffix = randomBytes(2).toString('hex').toUpperCase()
  return `${prefix}-${stamp}-${suffix}`
}

async function syncProductStatus(tx: Prisma.TransactionClient, productId: string) {
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) return
  if (product.stock === 0 && product.status === 'Active') {
    await tx.product.update({ where: { id: productId }, data: { status: 'OutOfStock' } })
  } else if (product.stock > 0 && product.status === 'OutOfStock') {
    await tx.product.update({ where: { id: productId }, data: { status: 'Active' } })
  }
}

export async function createOrder(ownerId: string, input: CreateOrderInput) {
  const status = input.status ?? 'Pending'
  const active = !TERMINAL_ORDER_STATUSES.includes(status)
  const marketplace: MarketplaceName = marketplaceToDb(input.marketplace)

  const order = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: input.productId, ownerId } })
    if (!product) throw notFound('Produk tidak ditemukan.')

    if (active) {
      const updated = await tx.product.updateMany({
        where: { id: product.id, ownerId, stock: { gte: input.qty } },
        data: {
          stock: { decrement: input.qty },
          sold: status === 'Completed' ? { increment: input.qty } : undefined,
        },
      })
      if (updated.count === 0) throw conflict('INSUFFICIENT_STOCK', 'Stok produk tidak mencukupi.')
      await tx.inventoryMovement.create({
        data: {
          ownerId,
          productId: product.id,
          type: 'Out',
          qty: input.qty,
          note: `Pesanan baru — ${input.customer}`,
        },
      })
      await syncProductStatus(tx, product.id)
    }

    return tx.order.create({
      data: {
        id: generateOrderId(input.marketplace),
        ownerId,
        productId: product.id,
        productName: product.name,
        customer: input.customer,
        qty: input.qty,
        total: product.price * input.qty,
        unitCost: product.cost,
        status,
        marketplace,
        accountId: input.accountId ?? 'all',
        includedInBaseline: false,
        ...(input.date ? { date: new Date(`${input.date}T12:00:00.000Z`) } : {}),
      },
    })
  })

  return mapOrder(order)
}

export async function updateOrderStatus(ownerId: string, id: string, status: OrderStatus) {
  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findFirst({ where: { id, ownerId } })
    if (!existing) throw notFound('Pesanan tidak ditemukan.')
    if (existing.status === status) return existing

    const claimed = await tx.order.updateMany({
      where: { id, ownerId, status: existing.status },
      data: { status },
    })
    if (claimed.count === 0) {
      throw conflict('ORDER_STATUS_CONFLICT', 'Status pesanan sudah diubah oleh proses lain.')
    }

    const wasActive = !TERMINAL_ORDER_STATUSES.includes(existing.status)
    const isActive = !TERMINAL_ORDER_STATUSES.includes(status)
    let product = existing.productId
      ? await tx.product.findFirst({ where: { id: existing.productId, ownerId } })
      : null

    if (product && wasActive && !isActive) {
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: existing.qty } },
      })
      await tx.inventoryMovement.create({
        data: {
          ownerId,
          productId: product.id,
          type: 'In',
          qty: existing.qty,
          note:
            status === 'Cancelled'
              ? `Pembatalan pesanan ${existing.id}`
              : `Pengembalian pesanan ${existing.id}`,
        },
      })
      await syncProductStatus(tx, product.id)
      product = await tx.product.findUnique({ where: { id: product.id } })
    }

    if (product && !wasActive && isActive) {
      const updated = await tx.product.updateMany({
        where: { id: product.id, ownerId, stock: { gte: existing.qty } },
        data: { stock: { decrement: existing.qty } },
      })
      if (updated.count === 0) throw conflict('INSUFFICIENT_STOCK', 'Stok produk tidak mencukupi.')
      await tx.inventoryMovement.create({
        data: {
          ownerId,
          productId: product.id,
          type: 'Out',
          qty: existing.qty,
          note: `Pesanan diaktifkan kembali ${existing.id}`,
        },
      })
      await syncProductStatus(tx, product.id)
    }

    if (product) {
      if (status === 'Completed' && existing.status !== 'Completed') {
        await tx.product.update({
          where: { id: product.id },
          data: { sold: { increment: existing.qty } },
        })
      } else if (existing.status === 'Completed' && status !== 'Completed') {
        await tx.product.update({
          where: { id: product.id },
          data: { sold: { decrement: Math.min(existing.qty, product.sold) } },
        })
      }
    }

    return tx.order.findUniqueOrThrow({ where: { id } })
  })

  return mapOrder(order)
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export async function ordersCsv(ownerId: string, filters: OrderFilters) {
  const orders = await prisma.order.findMany({
    where: orderWhere(ownerId, filters),
    orderBy: { date: 'desc' },
  })
  const rows = [
    ['ID', 'Customer', 'Product', 'Qty', 'Total', 'Status', 'Marketplace', 'Date'],
    ...orders.map((order) => [
      order.id,
      order.customer,
      order.productName,
      order.qty,
      order.total,
      order.status,
      marketplaceFromDb(order.marketplace),
      dateKey(order.date),
    ]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

export async function listMarketplaces(ownerId: string) {
  const [connections, setting, deltas, products] = await Promise.all([
    prisma.marketplaceConnection.findMany({ where: { ownerId }, orderBy: { name: 'asc' } }),
    getSetting(ownerId),
    getDeltaOrders(ownerId),
    getProductsForMetrics(ownerId),
  ])
  const metrics = buildMetrics(setting, products, deltas)
  return {
    items: connections.map(mapConnection),
    performance: buildMarketplaces(setting, deltas),
    summary: {
      revenue: metrics.grossRevenue,
      orders: metrics.orders,
      connections: connections.length,
      connected: connections.filter((connection) => connection.status === 'connected').length,
    },
  }
}

export async function syncMarketplace(ownerId: string, id: string) {
  const connection = await prisma.marketplaceConnection.findFirst({ where: { id, ownerId } })
  if (!connection) throw notFound('Koneksi marketplace tidak ditemukan.')
  const updated = await prisma.marketplaceConnection.update({
    where: { id },
    data: { status: 'connected', lastSync: new Date(), note: null },
  })
  return mapConnection(updated)
}

export async function syncAllMarketplaces(ownerId: string) {
  await prisma.marketplaceConnection.updateMany({
    where: { ownerId },
    data: { status: 'connected', lastSync: new Date(), note: null },
  })
  return listMarketplaces(ownerId)
}

export async function listVouchers(ownerId: string, accountId?: string) {
  const vouchers = await prisma.sellerVoucher.findMany({
    where: {
      ownerId,
      ...(accountId && accountId !== 'all' ? { accountId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return vouchers.map(mapVoucher)
}

export async function createVoucher(ownerId: string, input: CreateVoucherInput) {
  const existing = await prisma.sellerVoucher.findFirst({
    where: { ownerId, code: input.code.toUpperCase() },
  })
  if (existing) throw conflict('VOUCHER_EXISTS', 'Kode voucher sudah digunakan.')

  const startDate = input.startDate
    ? new Date(`${input.startDate}T00:00:00.000Z`)
    : new Date()
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`)

  const voucher = await prisma.sellerVoucher.create({
    data: {
      ownerId,
      code: input.code.toUpperCase(),
      title: input.title,
      accountId: input.accountId ?? 'all',
      marketplace: marketplaceToDb(input.marketplace),
      kind: input.kind,
      value: input.value,
      minSpend: input.minSpend ?? 0,
      quota: input.quota ?? 0,
      used: 0,
      startDate,
      endDate,
      status: 'active',
    },
  })
  return mapVoucher(voucher)
}

export async function toggleVoucher(ownerId: string, id: string) {
  const existing = await prisma.sellerVoucher.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Voucher tidak ditemukan.')
  const nextStatus = existing.status === 'active' ? 'paused' : 'active'
  const updated = await prisma.sellerVoucher.update({
    where: { id },
    data: { status: nextStatus },
  })
  return mapVoucher(updated)
}

export async function listFlashSales(ownerId: string, accountId?: string) {
  const items = await prisma.sellerFlashSale.findMany({
    where: {
      ownerId,
      ...(accountId && accountId !== 'all' ? { accountId } : {}),
    },
    include: { product: { select: { name: true, price: true, sku: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return items.map(mapFlashSale)
}

export async function createFlashSale(ownerId: string, input: CreateFlashSaleInput) {
  const product = await prisma.product.findFirst({ where: { id: input.productId, ownerId } })
  if (!product) throw notFound('Produk tidak ditemukan.')

  const startDate = input.startDate
    ? new Date(`${input.startDate}T00:00:00.000Z`)
    : new Date()
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`)

  const sale = await prisma.sellerFlashSale.create({
    data: {
      ownerId,
      title: input.title,
      accountId: input.accountId ?? 'all',
      marketplace: marketplaceToDb(input.marketplace),
      productId: product.id,
      discountPct: input.discountPct,
      quota: input.quota,
      sold: 0,
      startDate,
      endDate,
      status: 'active',
    },
    include: { product: { select: { name: true, price: true, sku: true } } },
  })
  return mapFlashSale(sale)
}

export async function toggleFlashSale(ownerId: string, id: string) {
  const existing = await prisma.sellerFlashSale.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Flash sale tidak ditemukan.')
  const nextStatus = existing.status === 'active' ? 'paused' : 'active'
  const updated = await prisma.sellerFlashSale.update({
    where: { id },
    data: { status: nextStatus },
    include: { product: { select: { name: true, price: true, sku: true } } },
  })
  return mapFlashSale(updated)
}

export async function listAdCampaigns(ownerId: string, accountId?: string) {
  const items = await prisma.sellerAdCampaign.findMany({
    where: {
      ownerId,
      ...(accountId && accountId !== 'all' ? { accountId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return items.map(mapAdCampaign)
}

export async function createAdCampaign(ownerId: string, input: CreateAdCampaignInput) {
  const startDate = input.startDate
    ? new Date(`${input.startDate}T00:00:00.000Z`)
    : new Date()
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`)

  const campaign = await prisma.sellerAdCampaign.create({
    data: {
      ownerId,
      name: input.name,
      accountId: input.accountId ?? 'all',
      marketplace: marketplaceToDb(input.marketplace),
      objective: input.objective ?? 'Sales',
      budget: input.budget,
      spend: 0,
      revenue: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      startDate,
      endDate,
      status: 'active',
    },
  })
  return mapAdCampaign(campaign)
}

export async function toggleAdCampaign(ownerId: string, id: string) {
  const existing = await prisma.sellerAdCampaign.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Kampanye iklan tidak ditemukan.')
  const nextStatus = existing.status === 'active' ? 'paused' : 'active'
  const updated = await prisma.sellerAdCampaign.update({
    where: { id },
    data: { status: nextStatus },
  })
  return mapAdCampaign(updated)
}

export async function addAdBudget(ownerId: string, id: string, amount: number) {
  const existing = await prisma.sellerAdCampaign.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Kampanye iklan tidak ditemukan.')
  const updated = await prisma.sellerAdCampaign.update({
    where: { id },
    data: { budget: { increment: amount } },
  })
  return mapAdCampaign(updated)
}

export async function getPromotionsSummary(ownerId: string, accountId?: string) {
  const [vouchers, flashSales, ads] = await Promise.all([
    listVouchers(ownerId, accountId),
    listFlashSales(ownerId, accountId),
    listAdCampaigns(ownerId, accountId),
  ])

  const totalAdBudget = sum(ads.map((a) => a.budget))
  const totalAdSpend = sum(ads.map((a) => a.spend))
  const totalAdRevenue = sum(ads.map((a) => a.revenue))

  return {
    vouchers: {
      total: vouchers.length,
      active: vouchers.filter((v) => v.status === 'active').length,
      totalUsed: sum(vouchers.map((v) => v.used)),
    },
    flashSales: {
      total: flashSales.length,
      active: flashSales.filter((f) => f.status === 'active').length,
      totalSold: sum(flashSales.map((f) => f.sold)),
    },
    ads: {
      total: ads.length,
      active: ads.filter((a) => a.status === 'active').length,
      totalBudget: totalAdBudget,
      totalSpend: totalAdSpend,
      totalRevenue: totalAdRevenue,
      overallRoas: totalAdSpend > 0 ? round(totalAdRevenue / totalAdSpend, 2) : 0,
    },
  }
}

export interface LedgerEntryItem {
  id: string
  date: string
  accountId: string
  marketplace: ApiMarketplace
  type: LedgerType
  label: string
  detail?: string | null
  amount: number
  productId?: string | null
  ref?: string | null
}

export async function getSellerLedger(ownerId: string, accountId?: string) {
  const [orders, products, connections, vouchers, flashSales, ads, setting] = await Promise.all([
    prisma.order.findMany({
      where: {
        ownerId,
        ...(accountId && accountId !== 'all' ? { accountId } : {}),
      },
      orderBy: { date: 'desc' },
    }),
    prisma.product.findMany({ where: { ownerId } }),
    prisma.marketplaceConnection.findMany({ where: { ownerId } }),
    prisma.sellerVoucher.findMany({
      where: {
        ownerId,
        ...(accountId && accountId !== 'all' ? { accountId } : {}),
      },
    }),
    prisma.sellerFlashSale.findMany({
      where: {
        ownerId,
        ...(accountId && accountId !== 'all' ? { accountId } : {}),
      },
    }),
    prisma.sellerAdCampaign.findMany({
      where: {
        ownerId,
        ...(accountId && accountId !== 'all' ? { accountId } : {}),
      },
    }),
    getSetting(ownerId),
  ])

  const productByName = new Map(products.map((p) => [p.name, p]))
  const entries: LedgerEntryItem[] = []

  for (const order of orders) {
    const base = {
      accountId: order.accountId,
      marketplace: marketplaceFromDb(order.marketplace),
      ref: order.id,
      date: order.date.toISOString().slice(0, 10),
    }

    if (order.status === 'Returned') {
      entries.push({
        ...base,
        id: `${order.id}-refund`,
        type: 'refund',
        label: `Refund ${order.customer}`,
        detail: `${order.productName} · ${order.qty} unit`,
        amount: -order.total,
      })
      continue
    }

    if (!['Completed', 'Shipped'].includes(order.status)) continue

    const product = productByName.get(order.productName)
    entries.push({
      ...base,
      id: `${order.id}-income`,
      type: 'income',
      label: `Pesanan ${order.customer}`,
      detail: `${order.productName} · ${order.qty} unit`,
      amount: order.total,
      productId: product?.id,
    })
    entries.push({
      ...base,
      id: `${order.id}-platform`,
      type: 'platform_fee',
      label: 'Fee marketplace',
      detail: `${setting.marketplacePct}% dari ${order.id}`,
      amount: -Math.round((order.total * setting.marketplacePct) / 100),
      productId: product?.id,
    })
    entries.push({
      ...base,
      id: `${order.id}-affiliate`,
      type: 'affiliate_fee',
      label: 'Fee afiliasi',
      detail: `${setting.affiliatePct}% dari ${order.id}`,
      amount: -Math.round((order.total * setting.affiliatePct) / 100),
      productId: product?.id,
    })
    entries.push({
      ...base,
      id: `${order.id}-shipping`,
      type: 'shipping',
      label: 'Ongkir ditanggung',
      detail: order.id,
      amount: -setting.shippingPerOrder,
      productId: product?.id,
    })
    if (product) {
      entries.push({
        ...base,
        id: `${order.id}-cogs`,
        type: 'cogs',
        label: 'HPP barang terjual',
        detail: `${order.qty} unit ${product.sku}`,
        amount: -product.cost * order.qty,
        productId: product.id,
      })
    }
  }

  const totalIncome = sum(entries.filter((e) => e.type === 'income').map((e) => e.amount))

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
      date: voucher.endDate.toISOString().slice(0, 10),
      accountId: voucher.accountId,
      marketplace: marketplaceFromDb(voucher.marketplace),
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
      date: sale.endDate.toISOString().slice(0, 10),
      accountId: sale.accountId,
      marketplace: marketplaceFromDb(sale.marketplace),
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
      date: ad.endDate.toISOString().slice(0, 10),
      accountId: ad.accountId,
      marketplace: marketplaceFromDb(ad.marketplace),
      type: 'ads',
      label: ad.name,
      detail: `Spend Rp${ad.spend.toLocaleString('id-ID')} · ROAS ${ad.revenue > 0 ? (ad.revenue / ad.spend).toFixed(2) : '0'}x`,
      amount: -ad.spend,
      ref: ad.id,
    })
  }

  const nowString = todayJakarta()
  const accountsWithIncome = connections
    .map((c) => ({
      id: c.id,
      name: c.name,
      income: sum(
        entries.filter((e) => e.accountId === c.id && e.type === 'income').map((e) => e.amount),
      ),
    }))
    .filter((a) => a.income > 0)

  for (const account of accountsWithIncome) {
    entries.push({
      id: `${account.id}-opex`,
      date: nowString,
      accountId: account.id,
      marketplace: marketplaceFromDb(account.name),
      type: 'opex',
      label: 'Alokasi opex bulanan',
      detail: 'Dibagi proporsional dari pemasukan akun',
      amount: -Math.round((setting.opexMonthly * account.income) / Math.max(1, totalIncome)),
    })
  }

  entries.sort((a, b) => (a.date < b.date ? 1 : -1))

  const sumType = (type: LedgerType) =>
    sum(entries.filter((e) => e.type === type).map((e) => Math.abs(e.amount)))

  const income = sum(entries.filter((e) => e.type === 'income').map((e) => e.amount))
  const discounts = sumType('discount')
  const refunds = sumType('refund')
  const platformFees = sumType('platform_fee')
  const affiliateFees = sumType('affiliate_fee')
  const shipping = sumType('shipping')
  const cogs = sumType('cogs')
  const adsSpend = sumType('ads')
  const opex = sumType('opex')
  const totalCost = discounts + refunds + platformFees + affiliateFees + shipping + cogs + adsSpend + opex
  const net = sum(entries.map((e) => e.amount))
  const orderCount = entries.filter((e) => e.type === 'income').length

  const summary = {
    income,
    discounts,
    refunds,
    platformFees,
    affiliateFees,
    shipping,
    cogs,
    ads: adsSpend,
    opex,
    totalCost,
    net,
    margin: income > 0 ? round((net / income) * 100, 1) : 0,
    orders: orderCount,
    aov: orderCount > 0 ? Math.round(income / orderCount) : 0,
    payout: Math.max(0, net),
  }

  const dailySeries = Array.from({ length: 7 }, (_, index) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - index))
    const key = d.toISOString().slice(0, 10)
    const dayEntries = entries.filter((e) => e.date === key)
    const dayIncome = sum(dayEntries.filter((e) => e.amount > 0).map((e) => e.amount))
    const dayExpense = sum(dayEntries.filter((e) => e.amount < 0).map((e) => Math.abs(e.amount)))
    return {
      date: key,
      label: key.slice(5),
      income: dayIncome,
      expense: dayExpense,
      net: dayIncome - dayExpense,
    }
  })

  const platformSeries = Array.from({ length: 7 }, (_, index) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - index))
    const key = d.toISOString().slice(0, 10)
    const dayEntries = entries.filter((e) => e.type === 'income' && e.date === key)
    return {
      date: key,
      label: key.slice(5),
      tiktok: sum(dayEntries.filter((e) => e.marketplace === 'TikTok Shop').map((e) => e.amount)),
      shopee: sum(dayEntries.filter((e) => e.marketplace === 'Shopee').map((e) => e.amount)),
    }
  })

  return {
    items: entries,
    summary,
    dailySeries,
    platformSeries,
  }
}

export async function getSellerAgentReport(ownerId: string) {
  const [products, orders, movements, connections, _setting] = await Promise.all([
    prisma.product.findMany({ where: { ownerId }, orderBy: { sold: 'desc' } }),
    prisma.order.findMany({ where: { ownerId }, orderBy: { date: 'desc' } }),
    prisma.inventoryMovement.findMany({
      where: { ownerId },
      orderBy: { date: 'desc' },
      include: { product: { select: { name: true } } },
      take: 20,
    }),
    prisma.marketplaceConnection.findMany({ where: { ownerId } }),
    getSetting(ownerId),
  ])

  const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Processing')
  const shippedOrders = orders.filter((o) => o.status === 'Shipped')
  const completedOrders = orders.filter((o) => o.status === 'Completed')
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const outOfStock = products.filter((p) => p.stock === 0)
  const activeProducts = products.filter((p) => p.status === 'Active')
  const connectedStores = connections.filter((c) => c.status === 'connected')

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const ordersThisWeek = orders.filter((o) => o.date >= startOfWeek).length
  const restocksThisWeek = movements.filter((m) => m.type === 'In' && m.date >= startOfWeek).length
  const unitsOutThisWeek = sum(
    movements.filter((m) => m.type === 'Out' && m.date >= startOfWeek).map((m) => m.qty),
  )

  const totalRevenue = sum(completedOrders.map((o) => o.total))
  const inventoryValue = sum(products.map((p) => p.price * p.stock))

  const marketplacesSummary = [
    {
      name: 'TikTok Shop' as const,
      accounts: connections.filter((c) => c.name === 'TikTokShop'),
      revenue: sum(completedOrders.filter((o) => o.marketplace === 'TikTokShop').map((o) => o.total)),
      orders: completedOrders.filter((o) => o.marketplace === 'TikTokShop').length,
    },
    {
      name: 'Shopee' as const,
      accounts: connections.filter((c) => c.name === 'Shopee'),
      revenue: sum(completedOrders.filter((o) => o.marketplace === 'Shopee').map((o) => o.total)),
      orders: completedOrders.filter((o) => o.marketplace === 'Shopee').length,
    },
  ]

  const recommendations = [
    ...(lowStock.length > 0
      ? [
          {
            id: 'rec-stock',
            title: `Restock segera ${lowStock.length} produk`,
            detail: `${lowStock.map((p) => p.name).slice(0, 3).join(', ')} mendekati batas minimum stok.`,
            why: 'Mencegah kehilangan potensi penjualan saat promosi berjalan.',
            action: 'Buka Inventory',
          },
        ]
      : []),
    {
      id: 'rec-promo',
      title: 'Tingkatkan alokasi iklan produk unggulan',
      detail: `Produk terlaris ${products[0]?.name ?? 'utama'} memiliki margin yang sehat untuk scale up.`,
      why: 'ROAS kampanye aktif di atas rata-rata kategori.',
      action: 'Buka Promosi',
    },
  ]

  return {
    agent: {
      name: 'Ucup',
      role: 'Seller Agent',
      status: 'active',
      focus: 'Marketplace, stok, pesanan & profit',
    },
    metrics: {
      activeProducts: activeProducts.length,
      connectedStores: connectedStores.length,
      totalStores: connections.length,
      pendingOrders: pendingOrders.length,
      shippedOrders: shippedOrders.length,
      completedOrders: completedOrders.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      totalRevenue,
      inventoryValue,
      ordersThisWeek,
      restocksThisWeek,
      unitsOutThisWeek,
    },
    topProducts: products.slice(0, 6).map(mapProduct),
    criticalStock: lowStock.concat(outOfStock).slice(0, 10).map(mapProduct),
    marketplaces: marketplacesSummary.map((m) => ({
      name: m.name,
      connected: m.accounts.filter((a) => a.status === 'connected').length,
      total: m.accounts.length,
      revenue: m.revenue,
      orders: m.orders,
    })),
    recommendations,
    recentMovements: movements.map(mapMovement),
  }
}
