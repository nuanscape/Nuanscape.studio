import type {
  FinanceAsset,
  FinanceBudget,
  FinanceGoal,
  FinanceLiability,
  FinanceTransaction,
} from '@prisma/client'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'

const DAY_MS = 86_400_000
const PALETTE = ['#F5D64B', '#6DBBFF', '#FFD166', '#F0512B', '#FFE9A3', '#B4B4B4', '#7C8CF8']

export type FinanceRange = '7d' | '30d' | '3m' | '6m' | '1y'
export type ReportPeriod = '3m' | '6m' | '12m'

export interface TransactionFilters {
  type?: 'income' | 'expense'
  category?: string
  account?: 'Personal' | 'Business' | 'Marketplace'
  q?: string
  from?: string
  to?: string
  limit: number
  offset: number
}

export interface CreateTransactionInput {
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  date: string
  account: 'Personal' | 'Business' | 'Marketplace'
  recurring?: 'none' | 'monthly' | 'weekly'
  source?: string
  note?: string
}

export interface CreateBudgetInput {
  category: string
  limit: number
}

export interface CreateGoalInput {
  name: string
  target: number
  saved?: number
  deadline: string
  color?: string
}

export interface CreateAssetInput {
  name: string
  type: 'Cash' | 'Bank' | 'Investment' | 'Business' | 'Inventory'
  value: number
  note?: string
}

export interface CreateLiabilityInput {
  name: string
  type: 'Debt' | 'Obligation'
  value: number
  dueDate: string
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function jakartaParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function todayDateOnly(): string {
  const { year, month, day } = jakartaParts()
  return `${year}-${pad(month)}-${pad(day)}`
}

function currentMonthRange(): { start: Date; end: Date; key: string } {
  const { year, month } = jakartaParts()
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
    key: `${year}-${pad(month)}`,
  }
}

function lastMonthKeys(months: number): string[] {
  const { year, month } = jakartaParts()
  const keys: string[] = []
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - index, 1))
    keys.push(`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`)
  }
  return keys
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1)).toLocaleDateString('id-ID', {
    month: 'short',
    timeZone: 'UTC',
  })
}

function dayLabel(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function mapTransaction(transaction: FinanceTransaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    description: transaction.description,
    amount: transaction.amount,
    date: toDateOnly(transaction.date),
    account: transaction.account,
    recurring: transaction.recurring,
    ...(transaction.source ? { source: transaction.source } : {}),
    ...(transaction.note ? { note: transaction.note } : {}),
  }
}

function categoryTotals(
  rows: Array<{ category: string; amount: number }>,
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.category, (map.get(row.category) ?? 0) + row.amount)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function financeSummary(
  transactions: FinanceTransaction[],
  assets: FinanceAsset[],
  liabilities: FinanceLiability[],
) {
  const income = sum(transactions.filter((t) => t.type === 'income').map((t) => t.amount))
  const expense = sum(transactions.filter((t) => t.type === 'expense').map((t) => t.amount))
  const net = income - expense
  const assetTotal = sum(assets.map((asset) => asset.value))
  const liabilityTotal = sum(liabilities.map((liability) => liability.value))
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? round((net / income) * 100) : 0,
    balance: assetTotal - liabilityTotal,
    assetTotal,
    liabilityTotal,
    netWorth: assetTotal - liabilityTotal,
  }
}

async function budgetSpentMap(ownerId: string): Promise<Map<string, number>> {
  const { start, end } = currentMonthRange()
  const rows = await prisma.financeTransaction.groupBy({
    by: ['category'],
    where: { ownerId, type: 'expense', date: { gte: start, lt: end } },
    _sum: { amount: true },
  })
  return new Map(rows.map((row) => [row.category, row._sum.amount ?? 0]))
}

function mapBudget(budget: FinanceBudget, spent: number) {
  const remaining = budget.limitAmount - spent
  return {
    id: budget.id,
    category: budget.category,
    limit: budget.limitAmount,
    spent,
    remaining,
    usage: budget.limitAmount > 0 ? round((spent / budget.limitAmount) * 100) : 0,
    over: remaining < 0,
  }
}

export async function listTransactions(ownerId: string, filters: TransactionFilters) {
  const where = {
    ownerId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.account ? { account: filters.account } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: parseDateOnly(filters.from) } : {}),
            ...(filters.to ? { lte: parseDateOnly(filters.to) } : {}),
          },
        }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { description: { contains: filters.q, mode: 'insensitive' as const } },
            { category: { contains: filters.q, mode: 'insensitive' as const } },
            { source: { contains: filters.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [rows, total, incomeAgg, expenseAgg] = await prisma.$transaction([
    prisma.financeTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.financeTransaction.count({ where }),
    prisma.financeTransaction.aggregate({
      where: { ...where, type: 'income' },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.aggregate({
      where: { ...where, type: 'expense' },
      _sum: { amount: true },
    }),
  ])

  const income = incomeAgg._sum.amount ?? 0
  const expense = expenseAgg._sum.amount ?? 0
  return {
    items: rows.map(mapTransaction),
    total,
    limit: filters.limit,
    offset: filters.offset,
    totals: { income, expense, net: income - expense },
  }
}

export async function createTransaction(ownerId: string, input: CreateTransactionInput) {
  const transaction = await prisma.financeTransaction.create({
    data: {
      ownerId,
      type: input.type,
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: parseDateOnly(input.date),
      account: input.account,
      recurring: input.recurring ?? 'none',
      ...(input.source ? { source: input.source } : {}),
      ...(input.note ? { note: input.note } : {}),
    },
  })
  return mapTransaction(transaction)
}

export async function deleteTransaction(ownerId: string, id: string) {
  const result = await prisma.financeTransaction.deleteMany({ where: { id, ownerId } })
  if (result.count === 0) throw notFound('Transaksi tidak ditemukan.')
}

export async function getIncome(ownerId: string) {
  const rows = await prisma.financeTransaction.findMany({
    where: { ownerId, type: 'income' },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  const total = sum(rows.map((row) => row.amount))
  const recurring = rows.filter((row) => row.recurring !== 'none')
  const byCategory = categoryTotals(rows)
  const top = byCategory[0]

  const monthlyMap = new Map<string, number>()
  for (const row of rows) {
    const key = toDateOnly(row.date).slice(0, 7)
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + row.amount)
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, income]) => ({ key, label: monthLabel(key), income }))

  return {
    summary: {
      total,
      average: rows.length > 0 ? Math.round(total / rows.length) : 0,
      count: rows.length,
      recurringCount: recurring.length,
      recurringTotal: sum(recurring.map((row) => row.amount)),
      topSource: top
        ? { ...top, share: total > 0 ? round((top.value / total) * 100) : 0 }
        : null,
    },
    byCategory,
    monthly,
    items: rows.map(mapTransaction),
  }
}

export async function getExpenses(ownerId: string) {
  const rows = await prisma.financeTransaction.findMany({
    where: { ownerId, type: 'expense' },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  const total = sum(rows.map((row) => row.amount))
  const average = rows.length > 0 ? total / rows.length : 0
  const recurring = rows.filter((row) => row.recurring !== 'none')
  const byCategory = categoryTotals(rows)
  const unusual = rows.filter((row) => row.amount > average * 1.6)
  const top = byCategory[0]

  return {
    summary: {
      total,
      average: Math.round(average),
      count: rows.length,
      topCategory: top
        ? { ...top, share: total > 0 ? round((top.value / total) * 100) : 0 }
        : null,
      recurringCount: recurring.length,
      recurringTotal: sum(recurring.map((row) => row.amount)),
      unusualCount: unusual.length,
    },
    byCategory,
    unusual: unusual.map(mapTransaction),
    items: rows.map(mapTransaction),
  }
}

export async function listBudgets(ownerId: string) {
  const [budgets, spent] = await Promise.all([
    prisma.financeBudget.findMany({ where: { ownerId }, orderBy: { category: 'asc' } }),
    budgetSpentMap(ownerId),
  ])

  const items = budgets.map((budget) => mapBudget(budget, spent.get(budget.category) ?? 0))
  const limit = sum(items.map((item) => item.limit))
  const spentTotal = sum(items.map((item) => item.spent))
  const remaining = limit - spentTotal

  return {
    month: currentMonthRange().key,
    items,
    summary: {
      limit,
      spent: spentTotal,
      remaining,
      usage: limit > 0 ? round((spentTotal / limit) * 100) : 0,
    },
    over: items.filter((item) => item.over),
  }
}

export async function createBudget(ownerId: string, input: CreateBudgetInput) {
  const existing = await prisma.financeBudget.findUnique({
    where: { ownerId_category: { ownerId, category: input.category } },
    select: { id: true },
  })
  if (existing) throw conflict('BUDGET_EXISTS', 'Budget untuk kategori ini sudah ada.')

  const budget = await prisma.financeBudget.create({
    data: { ownerId, category: input.category, limitAmount: input.limit },
  })
  const spent = await budgetSpentMap(ownerId)
  return mapBudget(budget, spent.get(budget.category) ?? 0)
}

export async function updateBudget(
  ownerId: string,
  id: string,
  input: Partial<CreateBudgetInput>,
) {
  const current = await prisma.financeBudget.findFirst({ where: { id, ownerId } })
  if (!current) throw notFound('Budget tidak ditemukan.')

  if (input.category && input.category !== current.category) {
    const duplicate = await prisma.financeBudget.findUnique({
      where: { ownerId_category: { ownerId, category: input.category } },
      select: { id: true },
    })
    if (duplicate) throw conflict('BUDGET_EXISTS', 'Budget untuk kategori ini sudah ada.')
  }

  const budget = await prisma.financeBudget.update({
    where: { id: current.id },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.limit !== undefined ? { limitAmount: input.limit } : {}),
    },
  })
  const spent = await budgetSpentMap(ownerId)
  return mapBudget(budget, spent.get(budget.category) ?? 0)
}

export async function deleteBudget(ownerId: string, id: string) {
  const result = await prisma.financeBudget.deleteMany({ where: { id, ownerId } })
  if (result.count === 0) throw notFound('Budget tidak ditemukan.')
}

function mapGoal(goal: FinanceGoal) {
  const remaining = Math.max(0, goal.target - goal.saved)
  const daysLeft = Math.ceil((goal.deadline.getTime() - Date.now()) / DAY_MS)
  const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30))
  return {
    id: goal.id,
    name: goal.name,
    target: goal.target,
    saved: goal.saved,
    remaining,
    deadline: toDateOnly(goal.deadline),
    color: goal.color,
    progress: goal.target > 0 ? round(Math.min(100, (goal.saved / goal.target) * 100)) : 0,
    daysLeft,
    monthsLeft,
    monthlyNeed: Math.round(remaining / monthsLeft),
  }
}

export async function listGoals(ownerId: string) {
  const rows = await prisma.financeGoal.findMany({
    where: { ownerId },
    orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
  })
  const items = rows.map(mapGoal)
  const target = sum(items.map((item) => item.target))
  const saved = sum(items.map((item) => item.saved))

  return {
    items,
    summary: {
      target,
      saved,
      remaining: Math.max(0, target - saved),
      progress: target > 0 ? round((saved / target) * 100) : 0,
      monthlyNeed: sum(items.map((item) => item.monthlyNeed)),
      completed: items.filter((item) => item.saved >= item.target).length,
      active: items.filter((item) => item.saved < item.target).length,
    },
  }
}

export async function createGoal(ownerId: string, input: CreateGoalInput) {
  const saved = input.saved ?? 0
  if (saved > input.target) {
    throw badRequest('GOAL_SAVED_EXCEEDS_TARGET', 'Dana terkumpul tidak boleh melebihi target.')
  }

  const goal = await prisma.financeGoal.create({
    data: {
      ownerId,
      name: input.name,
      target: input.target,
      saved,
      deadline: parseDateOnly(input.deadline),
      color: input.color ?? PALETTE[0] ?? '#F5D64B',
    },
  })
  return mapGoal(goal)
}

export async function contributeGoal(ownerId: string, id: string, amount: number) {
  const goal = await prisma.financeGoal.findFirst({ where: { id, ownerId } })
  if (!goal) throw notFound('Goal tidak ditemukan.')

  const remaining = goal.target - goal.saved
  if (remaining <= 0) throw badRequest('GOAL_COMPLETED', 'Goal sudah mencapai target.')

  const applied = Math.min(amount, remaining)
  const updated = await prisma.financeGoal.update({
    where: { id: goal.id },
    data: { saved: { increment: applied } },
  })

  return {
    goal: mapGoal(updated),
    applied,
    capped: applied < amount,
    remaining: Math.max(0, updated.target - updated.saved),
  }
}

export async function listAssets(ownerId: string) {
  const [assets, liabilities] = await Promise.all([
    prisma.financeAsset.findMany({ where: { ownerId }, orderBy: { value: 'desc' } }),
    prisma.financeLiability.findMany({ where: { ownerId }, orderBy: { dueDate: 'asc' } }),
  ])

  const assetTotal = sum(assets.map((asset) => asset.value))
  const liabilityTotal = sum(liabilities.map((liability) => liability.value))
  const liquidity = sum(
    assets.filter((asset) => asset.type === 'Cash' || asset.type === 'Bank').map((asset) => asset.value),
  )

  const allocationMap = new Map<string, number>()
  for (const asset of assets) {
    allocationMap.set(asset.type, (allocationMap.get(asset.type) ?? 0) + asset.value)
  }
  const allocation = Array.from(allocationMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      share: assetTotal > 0 ? round((value / assetTotal) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    items: assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      value: asset.value,
      ...(asset.note ? { note: asset.note } : {}),
    })),
    liabilities: liabilities.map((liability) => ({
      id: liability.id,
      name: liability.name,
      type: liability.type,
      value: liability.value,
      dueDate: toDateOnly(liability.dueDate),
    })),
    summary: {
      assetTotal,
      liabilityTotal,
      netWorth: assetTotal - liabilityTotal,
      liquidity,
      liquidityShare: assetTotal > 0 ? round((liquidity / assetTotal) * 100) : 0,
      debtRatio: assetTotal > 0 ? round((liabilityTotal / assetTotal) * 100) : 0,
    },
    allocation,
  }
}

export async function createAsset(ownerId: string, input: CreateAssetInput) {
  const asset = await prisma.financeAsset.create({
    data: {
      ownerId,
      name: input.name,
      type: input.type,
      value: input.value,
      ...(input.note ? { note: input.note } : {}),
    },
  })
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    value: asset.value,
    ...(asset.note ? { note: asset.note } : {}),
  }
}

export async function deleteAsset(ownerId: string, id: string) {
  const result = await prisma.financeAsset.deleteMany({ where: { id, ownerId } })
  if (result.count === 0) throw notFound('Aset tidak ditemukan.')
}

export async function createLiability(ownerId: string, input: CreateLiabilityInput) {
  const liability = await prisma.financeLiability.create({
    data: {
      ownerId,
      name: input.name,
      type: input.type,
      value: input.value,
      dueDate: parseDateOnly(input.dueDate),
    },
  })
  return {
    id: liability.id,
    name: liability.name,
    type: liability.type,
    value: liability.value,
    dueDate: toDateOnly(liability.dueDate),
  }
}

export async function deleteLiability(ownerId: string, id: string) {
  const result = await prisma.financeLiability.deleteMany({ where: { id, ownerId } })
  if (result.count === 0) throw notFound('Liabilitas tidak ditemukan.')
}

async function monthlySeries(ownerId: string, months: number) {
  const keys = lastMonthKeys(months)
  const from = new Date(`${keys[0]}-01T00:00:00.000Z`)
  const [transactions, snapshots] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: { ownerId, date: { gte: from } },
      select: { date: true, type: true, amount: true },
    }),
    prisma.financeMonthlySnapshot.findMany({ where: { ownerId } }),
  ])

  const actual = new Map<string, { income: number; expense: number; count: number }>()
  for (const transaction of transactions) {
    const key = toDateOnly(transaction.date).slice(0, 7)
    const bucket = actual.get(key) ?? { income: 0, expense: 0, count: 0 }
    if (transaction.type === 'income') bucket.income += transaction.amount
    else bucket.expense += transaction.amount
    bucket.count += 1
    actual.set(key, bucket)
  }

  const snapshot = new Map(
    snapshots.map((row) => [
      toDateOnly(row.month).slice(0, 7),
      { income: row.income, expense: row.expense },
    ]),
  )

  return keys.map((key) => {
    const live = actual.get(key)
    const base = live && live.count > 0 ? live : snapshot.get(key)
    const income = base?.income ?? 0
    const expense = base?.expense ?? 0
    return { key, label: monthLabel(key), income, expense, net: income - expense }
  })
}

async function dailySeries(ownerId: string, days: number) {
  const today = todayDateOnly()
  const from = new Date(`${today}T00:00:00.000Z`)
  from.setUTCDate(from.getUTCDate() - (days - 1))

  const transactions = await prisma.financeTransaction.findMany({
    where: { ownerId, date: { gte: from } },
    select: { date: true, type: true, amount: true },
  })

  const buckets = new Map<string, { income: number; expense: number }>()
  for (let index = 0; index < days; index += 1) {
    const date = new Date(from)
    date.setUTCDate(from.getUTCDate() + index)
    buckets.set(toDateOnly(date), { income: 0, expense: 0 })
  }

  for (const transaction of transactions) {
    const key = toDateOnly(transaction.date)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (transaction.type === 'income') bucket.income += transaction.amount
    else bucket.expense += transaction.amount
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => ({
    key,
    label: dayLabel(key),
    income: bucket.income,
    expense: bucket.expense,
    net: bucket.income - bucket.expense,
  }))
}

function buildInsights(
  summary: ReturnType<typeof financeSummary>,
  expenseCategories: Array<{ name: string; value: number }>,
  budgets: Awaited<ReturnType<typeof listBudgets>>,
) {
  const insights: Array<{
    id: string
    title: string
    detail: string
    why: string
    tone: 'positive' | 'warning' | 'neutral' | 'danger'
    action?: string
  }> = []

  insights.push(
    summary.savingsRate >= 30
      ? {
          id: 'fin-savings',
          title: `Savings rate ${summary.savingsRate.toFixed(1)}%`,
          detail: 'Arus kas positif di atas target 30%. Pertahankan porsi tabungan sebelum belanja.',
          why: 'Dihitung dari total pemasukan dikurangi pengeluaran terhadap pemasukan.',
          tone: 'positive',
        }
      : {
          id: 'fin-savings',
          title: `Savings rate ${summary.savingsRate.toFixed(1)}%`,
          detail: 'Rasio tabungan masih di bawah target 30%. Tinjau pengeluaran terbesar.',
          why: 'Dihitung dari total pemasukan dikurangi pengeluaran terhadap pemasukan.',
          tone: 'warning',
        },
  )

  const topExpense = expenseCategories[0]
  if (topExpense) {
    insights.push({
      id: 'fin-top-expense',
      title: `${topExpense.name} jadi pengeluaran terbesar`,
      detail: `Kategori ini menyerap Rp ${topExpense.value.toLocaleString('id-ID')} dari seluruh pengeluaran.`,
      why: 'Diurutkan dari total nominal transaksi pengeluaran yang tercatat.',
      tone: 'neutral',
      action: 'Tinjau kategori',
    })
  }

  if (budgets.over.length > 0) {
    insights.push({
      id: 'fin-budget-over',
      title: `${budgets.over.length} budget terlampaui`,
      detail: `${budgets.over.map((item) => item.category).join(', ')} melewati limit bulan ini.`,
      why: 'Budget terpakai dihitung dari transaksi pengeluaran bulan berjalan.',
      tone: 'danger',
      action: 'Realokasi budget',
    })
  }

  return insights
}

export async function getOverview(ownerId: string, range: FinanceRange = '30d') {
  const [transactions, assets, liabilities, budgets] = await Promise.all([
    prisma.financeTransaction.findMany({ where: { ownerId } }),
    prisma.financeAsset.findMany({ where: { ownerId } }),
    prisma.financeLiability.findMany({ where: { ownerId } }),
    listBudgets(ownerId),
  ])

  const summary = financeSummary(transactions, assets, liabilities)
  const expenseCategories = categoryTotals(
    transactions.filter((row) => row.type === 'expense'),
  ).map((category, index) => ({
    ...category,
    color: PALETTE[index % PALETTE.length] ?? '#B4B4B4',
  }))
  const incomeSources = categoryTotals(
    transactions.filter((row) => row.type === 'income'),
  ).map((category, index) => ({
    ...category,
    color: PALETTE[index % PALETTE.length] ?? '#B4B4B4',
  }))
  const healthScore = Math.min(
    96,
    Math.max(35, Math.round(summary.savingsRate * 1.55 + 32)),
  )

  const series =
    range === '7d' || range === '30d'
      ? await dailySeries(ownerId, range === '7d' ? 7 : 30)
      : await monthlySeries(
          ownerId,
          range === '3m' ? 3 : range === '6m' ? 6 : 12,
        )

  return {
    summary,
    healthScore,
    budgets: budgets.items.slice(0, 4),
    budgetSummary: budgets.summary,
    expenseCategories,
    incomeSources,
    series,
    insights: buildInsights(summary, expenseCategories, budgets),
    generatedAt: new Date().toISOString(),
  }
}

export async function getReports(ownerId: string, period: ReportPeriod = '6m') {
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
  const [series, transactions, assets, liabilities] = await Promise.all([
    monthlySeries(ownerId, months),
    prisma.financeTransaction.findMany({ where: { ownerId } }),
    prisma.financeAsset.findMany({ where: { ownerId } }),
    prisma.financeLiability.findMany({ where: { ownerId } }),
  ])

  const summary = financeSummary(transactions, assets, liabilities)
  const totalIncome = sum(series.map((point) => point.income))
  const totalExpense = sum(series.map((point) => point.expense))
  const totalNet = totalIncome - totalExpense
  const byCategory = categoryTotals(
    transactions.filter((row) => row.type === 'expense'),
  ).map((category, index) => ({
    ...category,
    color: PALETTE[index % PALETTE.length] ?? '#B4B4B4',
  }))
  const incomeByCategory = categoryTotals(
    transactions.filter((row) => row.type === 'income'),
  )

  return {
    period,
    months,
    series,
    totals: {
      income: totalIncome,
      expense: totalExpense,
      net: totalNet,
      margin: totalIncome > 0 ? round((totalNet / totalIncome) * 100) : 0,
      averageIncome: Math.round(totalIncome / months),
      averageExpense: Math.round(totalExpense / months),
    },
    byCategory,
    incomeByCategory,
    summary,
    runwayDays: summary.expense > 0 ? round(summary.balance / (summary.expense / 30), 1) : null,
    generatedAt: new Date().toISOString(),
  }
}

export function reportCsv(report: Awaited<ReturnType<typeof getReports>>): string {
  const lines = [
    'Periode,Income,Expense,Net',
    ...report.series.map(
      (point) => `${point.label},${point.income},${point.expense},${point.net}`,
    ),
    '',
    `Total,${report.totals.income},${report.totals.expense},${report.totals.net}`,
  ]
  return `${lines.join('\n')}\n`
}
