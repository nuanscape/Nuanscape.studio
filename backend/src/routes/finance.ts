import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { resolveOwnerId } from '../lib/owner.js'
import {
  contributeGoal,
  createAsset,
  createBudget,
  createGoal,
  createLiability,
  createTransaction,
  deleteAsset,
  deleteBudget,
  deleteLiability,
  deleteTransaction,
  getExpenses,
  getIncome,
  getOverview,
  getReports,
  listAssets,
  listBudgets,
  listGoals,
  listTransactions,
  reportCsv,
  updateBudget,
} from '../services/finance.js'

const idParams = z.object({ id: z.string().min(1) })

function isDateOnly(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal wajib YYYY-MM-DD.')
  .refine(isDateOnly, 'Tanggal tidak valid.')

const transactionType = z.enum(['income', 'expense'])
const transactionAccount = z.enum(['Personal', 'Business', 'Marketplace'])
const recurringInterval = z.enum(['none', 'monthly', 'weekly'])
const assetType = z.enum(['Cash', 'Bank', 'Investment', 'Business', 'Inventory'])
const liabilityType = z.enum(['Debt', 'Obligation'])
const rangeSchema = z.enum(['7d', '30d', '3m', '6m', '1y'])
const periodSchema = z.enum(['3m', '6m', '12m'])

const money = z.coerce.number().int().positive().max(2_000_000_000)

const transactionQuery = z.object({
  type: transactionType.optional(),
  category: z.string().trim().min(1).optional(),
  account: transactionAccount.optional(),
  q: z.string().trim().min(1).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createTransactionBody = z.object({
  type: transactionType,
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(2).max(160),
  amount: money,
  date: dateOnly,
  account: transactionAccount,
  recurring: recurringInterval.default('none'),
  source: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
})

const createBudgetBody = z.object({
  category: z.string().trim().min(1).max(60),
  limit: money,
})

const updateBudgetBody = z
  .object({
    category: z.string().trim().min(1).max(60).optional(),
    limit: money.optional(),
  })
  .refine((value) => value.category !== undefined || value.limit !== undefined, {
    message: 'Minimal satu field harus diubah.',
  })

const createGoalBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    target: money,
    saved: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
    deadline: dateOnly,
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Warna wajib format hex #RRGGBB.')
      .optional(),
  })
  .refine((value) => value.saved <= value.target, {
    message: 'Dana terkumpul tidak boleh melebihi target.',
    path: ['saved'],
  })

const contributeBody = z.object({ amount: money })

const createAssetBody = z.object({
  name: z.string().trim().min(2).max(80),
  type: assetType,
  value: money,
  note: z.string().trim().max(300).optional(),
})

const createLiabilityBody = z.object({
  name: z.string().trim().min(2).max(80),
  type: liabilityType,
  value: money,
  dueDate: dateOnly,
})

const reportQuery = z.object({ period: periodSchema.default('6m') })
const overviewQuery = z.object({ range: rangeSchema.default('30d') })

export const financeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/finance/overview',
    { schema: { tags: ['finance'], summary: 'Ringkasan finansial', querystring: overviewQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getOverview(ownerId, request.query.range)
    },
  )

  app.get(
    '/finance/transactions',
    { schema: { tags: ['finance'], summary: 'Daftar transaksi', querystring: transactionQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listTransactions(ownerId, request.query)
    },
  )

  app.post(
    '/finance/transactions',
    { schema: { tags: ['finance'], summary: 'Catat transaksi', body: createTransactionBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createTransaction(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.delete(
    '/finance/transactions/:id',
    { schema: { tags: ['finance'], summary: 'Hapus transaksi', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      await deleteTransaction(ownerId, request.params.id)
      return { ok: true }
    },
  )

  app.get(
    '/finance/income',
    { schema: { tags: ['finance'], summary: 'Ringkasan pemasukan' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getIncome(ownerId)
    },
  )

  app.get(
    '/finance/expenses',
    { schema: { tags: ['finance'], summary: 'Ringkasan pengeluaran' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getExpenses(ownerId)
    },
  )

  app.get(
    '/finance/budgets',
    { schema: { tags: ['finance'], summary: 'Daftar budget bulan berjalan' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listBudgets(ownerId)
    },
  )

  app.post(
    '/finance/budgets',
    { schema: { tags: ['finance'], summary: 'Buat budget', body: createBudgetBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createBudget(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.patch(
    '/finance/budgets/:id',
    {
      schema: {
        tags: ['finance'],
        summary: 'Ubah budget',
        params: idParams,
        body: updateBudgetBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateBudget(ownerId, request.params.id, request.body)
    },
  )

  app.delete(
    '/finance/budgets/:id',
    { schema: { tags: ['finance'], summary: 'Hapus budget', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      await deleteBudget(ownerId, request.params.id)
      return { ok: true }
    },
  )

  app.get(
    '/finance/goals',
    { schema: { tags: ['finance'], summary: 'Daftar goal' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listGoals(ownerId)
    },
  )

  app.post(
    '/finance/goals',
    { schema: { tags: ['finance'], summary: 'Buat goal', body: createGoalBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createGoal(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.post(
    '/finance/goals/:id/contribute',
    {
      schema: {
        tags: ['finance'],
        summary: 'Tambah dana ke goal (dibatasi target)',
        params: idParams,
        body: contributeBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return contributeGoal(ownerId, request.params.id, request.body.amount)
    },
  )

  app.get(
    '/finance/assets',
    { schema: { tags: ['finance'], summary: 'Aset, liabilitas, dan net worth' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listAssets(ownerId)
    },
  )

  app.post(
    '/finance/assets',
    { schema: { tags: ['finance'], summary: 'Tambah aset', body: createAssetBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createAsset(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.delete(
    '/finance/assets/:id',
    { schema: { tags: ['finance'], summary: 'Hapus aset', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      await deleteAsset(ownerId, request.params.id)
      return { ok: true }
    },
  )

  app.post(
    '/finance/liabilities',
    { schema: { tags: ['finance'], summary: 'Tambah liabilitas', body: createLiabilityBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createLiability(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.delete(
    '/finance/liabilities/:id',
    { schema: { tags: ['finance'], summary: 'Hapus liabilitas', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      await deleteLiability(ownerId, request.params.id)
      return { ok: true }
    },
  )

  app.get(
    '/finance/reports',
    { schema: { tags: ['finance'], summary: 'Laporan bulanan', querystring: reportQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getReports(ownerId, request.query.period)
    },
  )

  app.get(
    '/finance/reports/export',
    { schema: { tags: ['finance'], summary: 'Ekspor laporan CSV', querystring: reportQuery } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const report = await getReports(ownerId, request.query.period)
      const period = request.query.period
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="nuanscape-finance-${period}.csv"`)
        .send(reportCsv(report))
    },
  )
}