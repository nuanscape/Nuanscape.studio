import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `seller-v2-${suffix}@nuanscape.test`
const otherEmail = `seller-v2-other-${suffix}@nuanscape.test`

let ownerId = ''
let otherId = ''
let productId = ''
let voucherId = ''
let flashSaleId = ''
let adCampaignId = ''

function headers(id: string) {
  return { 'x-owner-id': id }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Seller V2 Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  const other = await prisma.user.create({
    data: {
      email: otherEmail,
      name: 'Seller V2 Other',
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

  const prod = await prisma.product.create({
    data: {
      ownerId,
      sku: `SKU-V2-${suffix}`,
      name: 'Product V2 Test',
      category: 'Electronics',
      price: 200_000,
      cost: 100_000,
      stock: 25,
      minStock: 5,
      sold: 10,
      marketplace: 'Both',
      accountIds: ['mc1', 'mc2'],
      discountPct: 10,
      status: 'Active',
    },
  })
  productId = prod.id

  await prisma.marketplaceConnection.createMany({
    data: [
      {
        id: `mc1-${suffix}`,
        ownerId,
        name: 'TikTokShop',
        storeName: 'TikTok Store V2',
        status: 'connected',
        permissions: ['Orders read', 'Products read'],
      },
      {
        id: `mc2-${suffix}`,
        ownerId,
        name: 'Shopee',
        storeName: 'Shopee Store V2',
        status: 'connected',
        permissions: ['Orders read'],
      },
    ],
  })

  // Create completed and returned orders for ledger testing
  await prisma.order.createMany({
    data: [
      {
        id: `ORD-COMP-${suffix}`,
        ownerId,
        productId,
        productName: 'Product V2 Test',
        customer: 'Customer A',
        qty: 2,
        total: 400_000,
        unitCost: 100_000,
        status: 'Completed',
        marketplace: 'TikTokShop',
        accountId: `mc1-${suffix}`,
        includedInBaseline: false,
      },
      {
        id: `ORD-REF-${suffix}`,
        ownerId,
        productId,
        productName: 'Product V2 Test',
        customer: 'Customer B',
        qty: 1,
        total: 200_000,
        unitCost: 100_000,
        status: 'Returned',
        marketplace: 'Shopee',
        accountId: `mc2-${suffix}`,
        includedInBaseline: false,
      },
    ],
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } })
  await app.close()
})

describe('Seller V2 - Promotions API', () => {
  it('POST /seller/vouchers - membuat voucher baru dan validasi unik kode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/vouchers',
      headers: headers(ownerId),
      payload: {
        code: `PROMO${suffix}`,
        title: 'Diskon 10% Spesial',
        marketplace: 'TikTok Shop',
        accountId: `mc1-${suffix}`,
        kind: 'percent',
        value: 10,
        minSpend: 100_000,
        quota: 100,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
    })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.code).toBe(`PROMO${suffix.toUpperCase()}`)
    expect(json.status).toBe('active')
    expect(json.kind).toBe('percent')
    voucherId = json.id

    // Duplikasi kode harus 409
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/vouchers',
      headers: headers(ownerId),
      payload: {
        code: `PROMO${suffix}`,
        title: 'Voucher Duplikat',
        marketplace: 'TikTok Shop',
        kind: 'fixed',
        value: 20_000,
        endDate: '2026-11-30',
      },
    })
    expect(dupRes.statusCode).toBe(409)
  })

  it('POST /seller/vouchers/:id/toggle - jeda dan aktifkan kembali voucher', async () => {
    const pauseRes = await app.inject({
      method: 'POST',
      url: `/api/v1/seller/vouchers/${voucherId}/toggle`,
      headers: headers(ownerId),
    })
    expect(pauseRes.statusCode).toBe(200)
    expect(pauseRes.json().status).toBe('paused')

    const resumeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/seller/vouchers/${voucherId}/toggle`,
      headers: headers(ownerId),
    })
    expect(resumeRes.statusCode).toBe(200)
    expect(resumeRes.json().status).toBe('active')
  })

  it('GET /seller/vouchers - daftar voucher dengan filter accountId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/seller/vouchers?accountId=mc1-${suffix}`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const items = res.json()
    expect(Array.isArray(items)).toBe(true)
    expect(items.some((v: { id: string }) => v.id === voucherId)).toBe(true)
  })

  it('POST /seller/flash-sales - membuat flash sale baru', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/flash-sales',
      headers: headers(ownerId),
      payload: {
        title: 'Flash Sale 25% Gadget',
        marketplace: 'Shopee',
        accountId: `mc2-${suffix}`,
        productId,
        discountPct: 25,
        quota: 50,
        startDate: '2026-11-10',
        endDate: '2026-11-20',
      },
    })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.discountPct).toBe(25)
    expect(json.status).toBe('active')
    expect(json.productName).toBe('Product V2 Test')
    flashSaleId = json.id
  })

  it('POST /seller/flash-sales/:id/toggle - toggle status flash sale', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/seller/flash-sales/${flashSaleId}/toggle`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('paused')
  })

  it('POST /seller/ad-campaigns - membuat kampanye iklan baru', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/ad-campaigns',
      headers: headers(ownerId),
      payload: {
        name: 'Kampanye Iklan Peluncuran',
        marketplace: 'TikTok Shop',
        accountId: `mc1-${suffix}`,
        objective: 'Sales',
        budget: 500_000,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
    })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.budget).toBe(500_000)
    expect(json.status).toBe('active')
    adCampaignId = json.id
  })

  it('POST /seller/ad-campaigns/:id/budget - tambah anggaran kampanye iklan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/seller/ad-campaigns/${adCampaignId}/budget`,
      headers: headers(ownerId),
      payload: { amount: 250_000 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().budget).toBe(750_000)
  })

  it('GET /seller/promotions/summary - ringkasan metrik promosi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/promotions/summary',
      headers: headers(ownerId),
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.vouchers.total).toBeGreaterThanOrEqual(1)
    expect(json.flashSales.total).toBeGreaterThanOrEqual(1)
    expect(json.ads.total).toBeGreaterThanOrEqual(1)
    expect(json.ads.totalBudget).toBeGreaterThanOrEqual(750_000)
  })
})

describe('Seller V2 - Ledger API', () => {
  it('GET /seller/ledger - menghasilkan daftar entri dan ringkasan buku kas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/ledger',
      headers: headers(ownerId),
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(Array.isArray(json.items)).toBe(true)
    expect(json.summary).toBeDefined()
    expect(json.summary.income).toBe(400_000)
    expect(json.summary.refunds).toBe(200_000)
    expect(json.summary.platformFees).toBeGreaterThan(0)
    expect(json.summary.shipping).toBeGreaterThan(0)
    expect(json.summary.cogs).toBe(200_000)
    expect(Array.isArray(json.dailySeries)).toBe(true)
    expect(json.dailySeries.length).toBe(7)
    expect(Array.isArray(json.platformSeries)).toBe(true)
    expect(json.platformSeries.length).toBe(7)
  })

  it('GET /seller/ledger?accountId=... - filter ledger berdasarkan akun toko', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/seller/ledger?accountId=mc1-${suffix}`,
      headers: headers(ownerId),
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.summary.income).toBe(400_000)
    // Di mc1 tidak ada refund karena refund ada di mc2
    expect(json.summary.refunds).toBe(0)
  })
})

describe('Seller V2 - Agent Report API (Ucup)', () => {
  it('GET /seller/agent-report - menghasilkan profil agen, kesehatan stok, dan rekomendasi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/seller/agent-report',
      headers: headers(ownerId),
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.agent.name).toBe('Ucup')
    expect(json.agent.role).toBe('Seller Agent')
    expect(json.metrics).toBeDefined()
    expect(json.metrics.activeProducts).toBeGreaterThanOrEqual(1)
    expect(json.metrics.connectedStores).toBe(2)
    expect(Array.isArray(json.topProducts)).toBe(true)
    expect(Array.isArray(json.criticalStock)).toBe(true)
    expect(Array.isArray(json.marketplaces)).toBe(true)
    expect(Array.isArray(json.recommendations)).toBe(true)
  })
})

describe('Seller V2 - Product & Order Scope', () => {
  it('POST /seller/products & /seller/orders menyimpan accountId dan discountPct', async () => {
    const prodRes = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/products',
      headers: headers(ownerId),
      payload: {
        sku: `SKU-ACC-${suffix}`,
        name: 'Multi Account Product',
        category: 'Accessories',
        price: 150_000,
        cost: 80_000,
        stock: 10,
        minStock: 2,
        accountIds: [`mc1-${suffix}`],
        discountPct: 5,
      },
    })
    expect(prodRes.statusCode).toBe(201)
    const prod = prodRes.json()
    expect(prod.accountIds).toEqual([`mc1-${suffix}`])
    expect(prod.discountPct).toBe(5)

    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/seller/orders',
      headers: headers(ownerId),
      payload: {
        productId: prod.id,
        customer: 'Test Buyer',
        qty: 1,
        marketplace: 'TikTok Shop',
        accountId: `mc1-${suffix}`,
      },
    })
    expect(orderRes.statusCode).toBe(201)
    expect(orderRes.json().accountId).toBe(`mc1-${suffix}`)
  })
})
