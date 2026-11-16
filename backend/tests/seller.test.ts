import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `seller-test-${suffix}@nuanscape.test`
const otherEmail = `seller-other-${suffix}@nuanscape.test`

let ownerId = ''
let otherId = ''
let productId = ''
let outProductId = ''
let connectionId = ''

function headers(id: string) {
  return { 'x-owner-id': id }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Seller Test Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  const other = await prisma.user.create({
    data: {
      email: otherEmail,
      name: 'Seller Other Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  otherId = other.id

  await prisma.sellerSetting.create({
    data: {
      ownerId,
      marketplacePct: 7,
      affiliatePct: 2,
      shippingPerOrder: 10_000,
      adsMonthly: 50_000,
      opexMonthly: 30_000,
      grossRevenue30d: 1_000_000,
      cogs30d: 400_000,
      discounts30d: 0,
      refunds30d: 100_000,
      orderCount30d: 10,
      tiktokRevenue30d: 600_000,
      shopeeRevenue30d: 400_000,
      tiktokOrders30d: 6,
      shopeeOrders30d: 4,
    },
  })

  const product = await prisma.product.create({
    data: {
      ownerId,
      sku: `SKU-A-${suffix}`,
      name: 'Produk Uji Utama',
      category: 'Electronics',
      price: 100_000,
      cost: 60_000,
      stock: 10,
      minStock: 3,
      marketplace: 'Both',
      seoScore: 65,
      geoScore: 60,
      status: 'Active',
    },
  })
  productId = product.id

  const outProduct = await prisma.product.create({
    data: {
      ownerId,
      sku: `SKU-B-${suffix}`,
      name: 'Produk Uji Habis',
      category: 'Accessories',
      price: 50_000,
      cost: 25_000,
      stock: 0,
      minStock: 5,
      marketplace: 'Shopee',
      seoScore: 50,
      geoScore: 45,
      status: 'OutOfStock',
    },
  })
  outProductId = outProduct.id

  const connection = await prisma.marketplaceConnection.create({
    data: {
      ownerId,
      name: 'TikTokShop',
      storeName: 'Toko Uji',
      status: 'error',
      lastSync: new Date(Date.now() - 86_400_000),
      permissions: ['Orders read'],
      note: 'Token kedaluwarsa',
    },
  })
  connectionId = connection.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } })
  await app.close()
  await prisma.$disconnect()
})

describe('seller', () => {
  it('menghitung overview dari baseline dan inventory aktual', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/overview',
      headers: headers(ownerId),
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.metrics.grossRevenue).toBe(1_000_000)
    expect(body.metrics.netSales).toBe(900_000)
    expect(body.metrics.grossProfit).toBe(500_000)
    expect(body.metrics.orders).toBe(10)
    expect(body.metrics.inventoryValue).toBe(600_000)
    expect(body.metrics.inventoryUnits).toBe(10)
    expect(body.metrics.netProfit).toBe(239_000)
    expect(body.marketplaces[0].share).toBe(60)
    expect(body.series).toHaveLength(7)
    expect(body.insights.length).toBeGreaterThan(0)
  })

  it('memfilter produk dan mencegah SKU ganda', async () => {
    const filtered = await app.inject({
      method: 'GET',
      url: `/api/v1/seller/products?q=utama`,
      headers: headers(ownerId),
    })
    expect(filtered.statusCode).toBe(200)
    expect(filtered.json().total).toBe(1)

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/products',
      headers: headers(ownerId),
      payload: {
        sku: `SKU-A-${suffix}`,
        name: 'Produk Duplikat',
        category: 'Workspace',
        price: 10_000,
        cost: 5_000,
      },
    })
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json().error.code).toBe('SKU_TAKEN')
  })

  it('membuat, mengubah, dan menghapus produk beserta pergerakan stok', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/products',
      headers: headers(ownerId),
      payload: {
        sku: `SKU-C-${suffix}`,
        name: 'Produk Baru',
        category: 'Lifestyle',
        price: 75_000,
        cost: 30_000,
        stock: 7,
        minStock: 2,
        marketplace: 'TikTok Shop',
        status: 'Active',
        seoScore: 80,
        geoScore: 70,
      },
    })
    expect(created.statusCode).toBe(201)
    const product = created.json()
    expect(product.stock).toBe(7)
    expect(product.marketplace).toBe('TikTok Shop')

    const movements = await prisma.inventoryMovement.findMany({
      where: { ownerId, productId: product.id },
    })
    expect(movements).toHaveLength(1)
    expect(movements[0]?.type).toBe('In')

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/seller/products/${product.id}`,
      headers: headers(ownerId),
      payload: { stock: 4, price: 80_000 },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().stock).toBe(4)
    expect(updated.json().price).toBe(80_000)

    const adjusted = await prisma.inventoryMovement.findMany({
      where: { ownerId, productId: product.id },
      orderBy: { date: 'desc' },
    })
    expect(adjusted).toHaveLength(2)
    expect(adjusted[0]?.type).toBe('Out')
    expect(adjusted[0]?.qty).toBe(3)

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/seller/products/${product.id}`,
      headers: headers(ownerId),
    })
    expect(deleted.statusCode).toBe(200)
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(0)
  })

  it('mencatat restock dan mengaktifkan produk yang stoknya habis', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/seller/inventory/${outProductId}/restock`,
      headers: headers(ownerId),
      payload: { qty: 5, note: 'Restock uji' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.product.stock).toBe(5)
    expect(body.product.status).toBe('Active')
    expect(body.movement.type).toBe('in')
    expect(body.movement.qty).toBe(5)

    const inventory = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/inventory',
      headers: headers(ownerId),
    })
    expect(inventory.statusCode).toBe(200)
    expect(inventory.json().summary.out).toBe(0)
    expect(inventory.json().movements[0].note).toBe('Restock uji')
  })

  it('membuat order, memotong stok, dan menghitung delta metrik', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/orders',
      headers: headers(ownerId),
      payload: {
        productId,
        customer: 'Pembeli Uji',
        qty: 2,
        marketplace: 'TikTok Shop',
      },
    })
    expect(created.statusCode).toBe(201)
    const order = created.json()
    expect(order.total).toBe(200_000)
    expect(order.status).toBe('Pending')

    const product = await prisma.product.findUnique({ where: { id: productId } })
    expect(product?.stock).toBe(8)

    const overview = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/overview',
      headers: headers(ownerId),
    })
    expect(overview.json().metrics.grossRevenue).toBe(1_200_000)
    expect(overview.json().metrics.orders).toBe(11)
    expect(overview.json().metrics.cogs).toBe(520_000)

    const completed = await app.inject({
      method: 'PATCH',
      url: `/api/v1/seller/orders/${order.id}/status`,
      headers: headers(ownerId),
      payload: { status: 'Completed' },
    })
    expect(completed.statusCode).toBe(200)
    expect(completed.json().status).toBe('Completed')
    const sold = await prisma.product.findUnique({ where: { id: productId } })
    expect(sold?.sold).toBe(2)

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/api/v1/seller/orders/${order.id}/status`,
      headers: headers(ownerId),
      payload: { status: 'Cancelled' },
    })
    expect(cancelled.statusCode).toBe(200)
    const restored = await prisma.product.findUnique({ where: { id: productId } })
    expect(restored?.stock).toBe(10)
    expect(restored?.sold).toBe(0)

    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/overview',
      headers: headers(ownerId),
    })
    expect(after.json().metrics.grossRevenue).toBe(1_000_000)
    expect(after.json().metrics.orders).toBe(10)
  })

  it('menolak order melebihi stok', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/orders',
      headers: headers(ownerId),
      payload: {
        productId,
        customer: 'Pembeli Serakah',
        qty: 999,
        marketplace: 'Shopee',
      },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('mengubah fee dan menghitung ulang profit serta waterfall', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/finance',
      headers: headers(ownerId),
    })
    const beforeProfit = before.json().metrics.netProfit

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/v1/seller/finance/fees',
      headers: headers(ownerId),
      payload: { marketplacePct: 10 },
    })
    expect(updated.statusCode).toBe(200)
    const body = updated.json()
    expect(body.fees.marketplacePct).toBe(10)
    expect(body.metrics.netProfit).toBeLessThan(beforeProfit)
    expect(body.waterfall.at(-1).name).toBe('Net Profit')
    expect(body.profitByProduct.length).toBe(2)
  })

  it('menyediakan SEO, intelligence, marketplace, dan CSV', async () => {
    const seo = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/seo',
      headers: headers(ownerId),
    })
    expect(seo.statusCode).toBe(200)
    expect(seo.json().summary.analyzed).toBe(2)
    expect(seo.json().items[0].seoScore).toBeLessThanOrEqual(seo.json().items[1].seoScore)

    const intelligence = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/intelligence',
      headers: headers(ownerId),
    })
    expect(intelligence.statusCode).toBe(200)
    expect(intelligence.json().ranked).toHaveLength(2)
    expect(intelligence.json().summary.analyzed).toBe(2)

    const synced = await app.inject({
      method: 'POST',
      url: `/api/v1/seller/marketplaces/${connectionId}/sync`,
      headers: headers(ownerId),
    })
    expect(synced.statusCode).toBe(200)
    expect(synced.json().status).toBe('connected')
    expect(synced.json().note).toBeUndefined()

    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/orders/export',
      headers: headers(ownerId),
    })
    expect(csv.statusCode).toBe(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.body).toContain('ID,Customer,Product')
  })

  it('mengisolasi data antar owner', async () => {
    const products = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/products',
      headers: headers(otherId),
    })
    expect(products.statusCode).toBe(200)
    expect(products.json().total).toBe(0)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/seller/products/${productId}`,
      headers: headers(otherId),
    })
    expect(detail.statusCode).toBe(404)
  })
})