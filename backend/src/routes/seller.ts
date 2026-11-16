import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { resolveOwnerId } from '../lib/owner.js'
import {
  addAdBudget,
  createAdCampaign,
  createFlashSale,
  createOrder,
  createProduct,
  createVoucher,
  deleteProduct,
  getFinance,
  getIntelligence,
  getInventory,
  getOrder,
  getOverview,
  getProduct,
  getPromotionsSummary,
  getSellerAgentReport,
  getSellerLedger,
  getSeo,
  listAdCampaigns,
  listFlashSales,
  listMarketplaces,
  listOrders,
  listProducts,
  listVouchers,
  ordersCsv,
  restockProduct,
  syncAllMarketplaces,
  syncMarketplace,
  toggleAdCampaign,
  toggleFlashSale,
  toggleVoucher,
  updateFees,
  updateOrderStatus,
  updateProduct,
} from '../services/seller.js'

const idParams = z.object({ id: z.string().min(1) })
const bearer = [{ bearerAuth: [] }]

function isDateOnly(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal wajib YYYY-MM-DD.')
  .refine(isDateOnly, 'Tanggal tidak valid.')

const productMarketplace = z.enum(['TikTok Shop', 'Shopee', 'Both'])
const productStatus = z.enum(['Active', 'Paused', 'Out of Stock'])
const orderMarketplace = z.enum(['TikTok Shop', 'Shopee'])
const orderStatus = z.enum([
  'Pending',
  'Processing',
  'Shipped',
  'Completed',
  'Cancelled',
  'Returned',
])

const money = z.coerce.number().int().min(0).max(2_000_000_000)
const positiveMoney = z.coerce.number().int().positive().max(2_000_000_000)
const percent = z.coerce.number().min(0).max(100)
const score = z.coerce.number().int().min(0).max(100)
const quantity = z.coerce.number().int().min(0).max(1_000_000)

const accountScopeQuery = z.object({
  accountId: z.string().trim().min(1).optional(),
})

const productQuery = z.object({
  q: z.string().trim().min(1).optional(),
  status: productStatus.optional(),
  category: z.string().trim().min(1).optional(),
  marketplace: productMarketplace.optional(),
  stock: z.enum(['low', 'out', 'active']).optional(),
  accountId: z.string().trim().min(1).optional(),
})

const createProductBody = z.object({
  sku: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9._-]+$/, 'SKU hanya boleh berisi huruf, angka, titik, garis, dan underscore.'),
  name: z.string().trim().min(3).max(120),
  category: z.string().trim().min(1).max(60),
  price: positiveMoney,
  cost: positiveMoney,
  stock: quantity.default(0),
  minStock: quantity.default(0),
  marketplace: productMarketplace.default('Both'),
  accountIds: z.array(z.string().trim().min(1)).default([]),
  discountPct: percent.default(0),
  status: productStatus.default('Active'),
  seoScore: score.default(0),
  geoScore: score.default(0),
})

const updateProductBody = z
  .object({
    sku: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9._-]+$/, 'SKU hanya boleh berisi huruf, angka, titik, garis, dan underscore.')
      .optional(),
    name: z.string().trim().min(3).max(120).optional(),
    category: z.string().trim().min(1).max(60).optional(),
    price: positiveMoney.optional(),
    cost: positiveMoney.optional(),
    stock: quantity.optional(),
    minStock: quantity.optional(),
    marketplace: productMarketplace.optional(),
    accountIds: z.array(z.string().trim().min(1)).optional(),
    discountPct: percent.optional(),
    status: productStatus.optional(),
    seoScore: score.optional(),
    geoScore: score.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Minimal satu field harus diubah.',
  })

const restockBody = z.object({
  qty: z.coerce.number().int().positive().max(1_000_000),
  note: z.string().trim().max(200).optional(),
})

const inventoryQuery = z.object({
  movementLimit: z.coerce.number().int().min(1).max(200).default(30),
})

const orderQuery = z.object({
  status: orderStatus.optional(),
  marketplace: orderMarketplace.optional(),
  accountId: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createOrderBody = z.object({
  productId: z.string().min(1),
  customer: z.string().trim().min(2).max(80),
  qty: z.coerce.number().int().positive().max(10_000),
  marketplace: orderMarketplace,
  accountId: z.string().trim().min(1).default('all'),
  status: orderStatus.default('Pending'),
  date: dateOnly.optional(),
})

const createVoucherBody = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9._-]+$/, 'Kode voucher hanya boleh berisi huruf, angka, titik, garis, dan underscore.'),
  title: z.string().trim().min(3).max(120),
  accountId: z.string().trim().min(1).default('all'),
  marketplace: orderMarketplace,
  kind: z.enum(['percent', 'fixed', 'shipping']),
  value: positiveMoney,
  minSpend: money.default(0),
  quota: quantity.default(0),
  startDate: dateOnly.optional(),
  endDate: dateOnly,
})

const createFlashSaleBody = z.object({
  title: z.string().trim().min(3).max(120),
  accountId: z.string().trim().min(1).default('all'),
  marketplace: orderMarketplace,
  productId: z.string().min(1),
  discountPct: percent.refine((v) => v > 0 && v <= 90, 'Diskon flash sale harus antara 1% dan 90%.'),
  quota: z.coerce.number().int().positive().max(1_000_000),
  startDate: dateOnly.optional(),
  endDate: dateOnly,
})

const createAdCampaignBody = z.object({
  name: z.string().trim().min(3).max(120),
  accountId: z.string().trim().min(1).default('all'),
  marketplace: orderMarketplace,
  objective: z.enum(['Sales', 'Traffic', 'Live']).default('Sales'),
  budget: positiveMoney,
  startDate: dateOnly.optional(),
  endDate: dateOnly,
})

const addBudgetBody = z.object({
  amount: positiveMoney,
})

const updateOrderStatusBody = z.object({ status: orderStatus })

const feeBody = z
  .object({
    marketplacePct: percent.optional(),
    affiliatePct: percent.optional(),
    shippingPerOrder: money.optional(),
    adsMonthly: money.optional(),
    opexMonthly: money.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Minimal satu field harus diubah.',
  })

export const sellerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/seller/overview',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ringkasan Seller Center',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getOverview(ownerId)
    },
  )

  app.get(
    '/seller/products',
    {
      schema: {
        tags: ['seller'],
        summary: 'Daftar produk dengan filter',
        querystring: productQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listProducts(ownerId, request.query)
    },
  )

  app.post(
    '/seller/products',
    {
      schema: {
        tags: ['seller'],
        summary: 'Tambah produk',
        body: createProductBody,
        security: bearer,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createProduct(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.get(
    '/seller/products/:id',
    {
      schema: {
        tags: ['seller'],
        summary: 'Detail produk',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getProduct(ownerId, request.params.id)
    },
  )

  app.patch(
    '/seller/products/:id',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ubah produk',
        params: idParams,
        body: updateProductBody,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateProduct(ownerId, request.params.id, request.body)
    },
  )

  app.delete(
    '/seller/products/:id',
    {
      schema: {
        tags: ['seller'],
        summary: 'Hapus produk',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      await deleteProduct(ownerId, request.params.id)
      return { ok: true }
    },
  )

  app.get(
    '/seller/inventory',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ringkasan inventory dan pergerakan stok',
        querystring: inventoryQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getInventory(ownerId, request.query.movementLimit)
    },
  )

  app.post(
    '/seller/inventory/:id/restock',
    {
      schema: {
        tags: ['seller'],
        summary: 'Catat restock produk',
        params: idParams,
        body: restockBody,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return restockProduct(ownerId, request.params.id, request.body.qty, request.body.note)
    },
  )

  app.get(
    '/seller/orders',
    {
      schema: {
        tags: ['seller'],
        summary: 'Daftar pesanan',
        querystring: orderQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listOrders(ownerId, request.query)
    },
  )

  app.post(
    '/seller/orders',
    {
      schema: {
        tags: ['seller'],
        summary: 'Catat pesanan baru',
        body: createOrderBody,
        security: bearer,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createOrder(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.get(
    '/seller/orders/export',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ekspor pesanan CSV',
        querystring: orderQuery,
        security: bearer,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const csv = await ordersCsv(ownerId, request.query)
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', 'attachment; filename="seller-orders.csv"')
        .send(csv)
    },
  )

  app.get(
    '/seller/orders/:id',
    {
      schema: {
        tags: ['seller'],
        summary: 'Detail pesanan',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getOrder(ownerId, request.params.id)
    },
  )

  app.patch(
    '/seller/orders/:id/status',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ubah status pesanan',
        params: idParams,
        body: updateOrderStatusBody,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateOrderStatus(ownerId, request.params.id, request.body.status)
    },
  )

  app.get(
    '/seller/marketplaces',
    {
      schema: {
        tags: ['seller'],
        summary: 'Koneksi dan performa marketplace',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listMarketplaces(ownerId)
    },
  )

  app.post(
    '/seller/marketplaces/sync',
    {
      schema: {
        tags: ['seller'],
        summary: 'Sinkronkan semua marketplace',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return syncAllMarketplaces(ownerId)
    },
  )

  app.post(
    '/seller/marketplaces/:id/sync',
    {
      schema: {
        tags: ['seller'],
        summary: 'Sinkronkan satu marketplace',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return syncMarketplace(ownerId, request.params.id)
    },
  )

  app.get(
    '/seller/finance',
    {
      schema: {
        tags: ['seller'],
        summary: 'Metrik profit, waterfall, dan fee',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getFinance(ownerId)
    },
  )

  app.patch(
    '/seller/finance/fees',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ubah konfigurasi fee',
        body: feeBody,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateFees(ownerId, request.body)
    },
  )

  app.get(
    '/seller/seo',
    {
      schema: {
        tags: ['seller'],
        summary: 'Audit SEO dan GEO produk',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getSeo(ownerId)
    },
  )

  app.get(
    '/seller/intelligence',
    {
      schema: {
        tags: ['seller'],
        summary: 'Product intelligence dan sinyal keputusan',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getIntelligence(ownerId)
    },
  )

  app.get(
    '/seller/promotions/summary',
    {
      schema: {
        tags: ['seller'],
        summary: 'Ringkasan performa promosi (voucher, flash sale, ads)',
        querystring: accountScopeQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getPromotionsSummary(ownerId, request.query.accountId)
    },
  )

  app.get(
    '/seller/vouchers',
    {
      schema: {
        tags: ['seller'],
        summary: 'Daftar voucher promosi toko',
        querystring: accountScopeQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listVouchers(ownerId, request.query.accountId)
    },
  )

  app.post(
    '/seller/vouchers',
    {
      schema: {
        tags: ['seller'],
        summary: 'Buat voucher promosi toko',
        body: createVoucherBody,
        security: bearer,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const voucher = await createVoucher(ownerId, request.body)
      reply.code(201)
      return voucher
    },
  )

  app.post(
    '/seller/vouchers/:id/toggle',
    {
      schema: {
        tags: ['seller'],
        summary: 'Aktifkan atau jeda voucher',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return toggleVoucher(ownerId, request.params.id)
    },
  )

  app.get(
    '/seller/flash-sales',
    {
      schema: {
        tags: ['seller'],
        summary: 'Daftar flash sale toko',
        querystring: accountScopeQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listFlashSales(ownerId, request.query.accountId)
    },
  )

  app.post(
    '/seller/flash-sales',
    {
      schema: {
        tags: ['seller'],
        summary: 'Jadwalkan flash sale baru',
        body: createFlashSaleBody,
        security: bearer,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const sale = await createFlashSale(ownerId, request.body)
      reply.code(201)
      return sale
    },
  )

  app.post(
    '/seller/flash-sales/:id/toggle',
    {
      schema: {
        tags: ['seller'],
        summary: 'Aktifkan atau jeda flash sale',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return toggleFlashSale(ownerId, request.params.id)
    },
  )

  app.get(
    '/seller/ad-campaigns',
    {
      schema: {
        tags: ['seller'],
        summary: 'Daftar kampanye iklan marketplace',
        querystring: accountScopeQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listAdCampaigns(ownerId, request.query.accountId)
    },
  )

  app.post(
    '/seller/ad-campaigns',
    {
      schema: {
        tags: ['seller'],
        summary: 'Buat kampanye iklan marketplace baru',
        body: createAdCampaignBody,
        security: bearer,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const campaign = await createAdCampaign(ownerId, request.body)
      reply.code(201)
      return campaign
    },
  )

  app.post(
    '/seller/ad-campaigns/:id/toggle',
    {
      schema: {
        tags: ['seller'],
        summary: 'Aktifkan atau jeda kampanye iklan',
        params: idParams,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return toggleAdCampaign(ownerId, request.params.id)
    },
  )

  app.post(
    '/seller/ad-campaigns/:id/budget',
    {
      schema: {
        tags: ['seller'],
        summary: 'Tambah anggaran kampanye iklan',
        params: idParams,
        body: addBudgetBody,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return addAdBudget(ownerId, request.params.id, request.body.amount)
    },
  )

  app.get(
    '/seller/ledger',
    {
      schema: {
        tags: ['seller'],
        summary: 'Buku kas e-commerce (income, diskon promo, fee, cogs, ads, opex, margin)',
        querystring: accountScopeQuery,
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getSellerLedger(ownerId, request.query.accountId)
    },
  )

  app.get(
    '/seller/agent-report',
    {
      schema: {
        tags: ['seller'],
        summary: 'Laporan agen Ucup (status toko, pergerakan stok, rekomendasi aksi)',
        security: bearer,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getSellerAgentReport(ownerId)
    },
  )
}