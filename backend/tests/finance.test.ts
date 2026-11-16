import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `finance-test-${suffix}@nuanscape.test`
const otherEmail = `finance-other-${suffix}@nuanscape.test`
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())

let ownerId = ''
let otherId = ''
let budgetId = ''
let goalId = ''
let assetId = ''
let liabilityId = ''

function headers(id: string) {
  return { 'x-owner-id': id }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Finance Test Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  const other = await prisma.user.create({
    data: {
      email: otherEmail,
      name: 'Finance Other Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  otherId = other.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } })
  await app.close()
  await prisma.$disconnect()
})

describe('finance', () => {
  it('mencatat transaksi dan menghitung total terfilter', async () => {
    const income = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/transactions',
      headers: headers(ownerId),
      payload: {
        type: 'income',
        category: 'Freelance',
        description: 'Proyek uji integrasi',
        amount: 10_000_000,
        date: today,
        account: 'Business',
        recurring: 'none',
        source: 'Klien Uji',
      },
    })
    expect(income.statusCode).toBe(201)
    expect(income.json().amount).toBe(10_000_000)
    expect(income.json().date).toBe(today)

    const expense = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/transactions',
      headers: headers(ownerId),
      payload: {
        type: 'expense',
        category: 'Makan',
        description: 'Makan siang tim',
        amount: 100_000,
        date: today,
        account: 'Personal',
      },
    })
    expect(expense.statusCode).toBe(201)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/transactions?type=expense&q=makan',
      headers: headers(ownerId),
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().total).toBe(1)
    expect(list.json().items[0].category).toBe('Makan')
    expect(list.json().totals).toEqual({ income: 0, expense: 100_000, net: -100_000 })

    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/transactions',
      headers: headers(ownerId),
    })
    expect(all.json().total).toBe(2)
    expect(all.json().totals.income).toBe(10_000_000)
    expect(all.json().totals.net).toBe(9_900_000)
  })

  it('validasi transaksi menolak nominal nol dan tanggal mustahil', async () => {
    const zero = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/transactions',
      headers: headers(ownerId),
      payload: {
        type: 'expense',
        category: 'Makan',
        description: 'Nominal nol',
        amount: 0,
        date: today,
        account: 'Personal',
      },
    })
    expect(zero.statusCode).toBe(400)

    const invalidDate = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/transactions',
      headers: headers(ownerId),
      payload: {
        type: 'expense',
        category: 'Makan',
        description: 'Tanggal mustahil',
        amount: 10_000,
        date: '2026-02-31',
        account: 'Personal',
      },
    })
    expect(invalidDate.statusCode).toBe(400)
  })

  it('budget terpakai dihitung dari transaksi bulan berjalan', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/budgets',
      headers: headers(ownerId),
      payload: { category: 'Makan', limit: 150_000 },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().spent).toBe(100_000)
    expect(created.json().remaining).toBe(50_000)
    budgetId = created.json().id

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/budgets',
      headers: headers(ownerId),
      payload: { category: 'Makan', limit: 200_000 },
    })
    expect(duplicate.statusCode).toBe(409)

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/finance/budgets/${budgetId}`,
      headers: headers(ownerId),
      payload: { limit: 50_000 },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().over).toBe(true)
    expect(updated.json().remaining).toBe(-50_000)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/budgets',
      headers: headers(ownerId),
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().items).toHaveLength(1)
    expect(list.json().over).toHaveLength(1)
    expect(list.json().summary.spent).toBe(100_000)
  })

  it('kontribusi goal dibatasi target dan ditolak setelah selesai', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/goals',
      headers: headers(ownerId),
      payload: {
        name: 'Dana Uji',
        target: 1_000_000,
        saved: 900_000,
        deadline: today,
        color: '#F5D64B',
      },
    })
    expect(created.statusCode).toBe(201)
    goalId = created.json().id

    const capped = await app.inject({
      method: 'POST',
      url: `/api/v1/finance/goals/${goalId}/contribute`,
      headers: headers(ownerId),
      payload: { amount: 250_000 },
    })
    expect(capped.statusCode).toBe(200)
    expect(capped.json().applied).toBe(100_000)
    expect(capped.json().capped).toBe(true)
    expect(capped.json().goal.saved).toBe(1_000_000)

    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/finance/goals/${goalId}/contribute`,
      headers: headers(ownerId),
      payload: { amount: 50_000 },
    })
    expect(again.statusCode).toBe(400)
    expect(again.json().error.code).toBe('GOAL_COMPLETED')

    const overTarget = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/goals',
      headers: headers(ownerId),
      payload: {
        name: 'Goal Invalid',
        target: 1_000_000,
        saved: 1_500_000,
        deadline: today,
      },
    })
    expect(overTarget.statusCode).toBe(400)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/goals',
      headers: headers(ownerId),
    })
    expect(list.json().summary.completed).toBe(1)
    expect(list.json().summary.saved).toBe(1_000_000)
  })

  it('mencatat aset dan liabilitas serta menghitung net worth', async () => {
    const asset = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/assets',
      headers: headers(ownerId),
      payload: { name: 'Rekening Uji', type: 'Bank', value: 5_000_000, note: 'Test' },
    })
    expect(asset.statusCode).toBe(201)
    assetId = asset.json().id

    const liability = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/liabilities',
      headers: headers(ownerId),
      payload: { name: 'Utang Uji', type: 'Debt', value: 1_000_000, dueDate: today },
    })
    expect(liability.statusCode).toBe(201)
    liabilityId = liability.json().id

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/assets',
      headers: headers(ownerId),
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().summary.assetTotal).toBe(5_000_000)
    expect(list.json().summary.liabilityTotal).toBe(1_000_000)
    expect(list.json().summary.netWorth).toBe(4_000_000)
    expect(list.json().summary.liquidity).toBe(5_000_000)
    expect(list.json().allocation[0].name).toBe('Bank')
  })

  it('overview, income, dan expenses konsisten dengan transaksi', async () => {
    const overview = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/overview?range=30d',
      headers: headers(ownerId),
    })
    expect(overview.statusCode).toBe(200)
    expect(overview.json().summary.income).toBe(10_000_000)
    expect(overview.json().summary.expense).toBe(100_000)
    expect(overview.json().summary.netWorth).toBe(4_000_000)
    expect(overview.json().series).toHaveLength(30)
    expect(overview.json().insights.length).toBeGreaterThan(0)

    const income = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/income',
      headers: headers(ownerId),
    })
    expect(income.statusCode).toBe(200)
    expect(income.json().summary.total).toBe(10_000_000)
    expect(income.json().summary.topSource.name).toBe('Freelance')
    expect(income.json().items).toHaveLength(1)

    const expenses = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/expenses',
      headers: headers(ownerId),
    })
    expect(expenses.statusCode).toBe(200)
    expect(expenses.json().summary.total).toBe(100_000)
    expect(expenses.json().summary.topCategory.name).toBe('Makan')
    expect(expenses.json().items).toHaveLength(1)
  })

  it('laporan bulanan dan ekspor CSV', async () => {
    const reports = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/reports?period=3m',
      headers: headers(ownerId),
    })
    expect(reports.statusCode).toBe(200)
    expect(reports.json().series).toHaveLength(3)
    expect(reports.json().totals.income).toBe(10_000_000)
    expect(reports.json().totals.expense).toBe(100_000)
    expect(reports.json().byCategory[0].name).toBe('Makan')

    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/reports/export?period=3m',
      headers: headers(ownerId),
    })
    expect(csv.statusCode).toBe(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.body.split('\n')[0]).toBe('Periode,Income,Expense,Net')
    expect(csv.body).toContain('10000000')
  })

  it('isolasi owner: user lain tidak melihat atau menghapus data', async () => {
    const otherBudgets = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/budgets',
      headers: headers(otherId),
    })
    expect(otherBudgets.statusCode).toBe(200)
    expect(otherBudgets.json().items).toHaveLength(0)

    const forbiddenDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/finance/budgets/${budgetId}`,
      headers: headers(otherId),
    })
    expect(forbiddenDelete.statusCode).toBe(404)

    const forbiddenAsset = await app.inject({
      method: 'DELETE',
      url: `/api/v1/finance/assets/${assetId}`,
      headers: headers(otherId),
    })
    expect(forbiddenAsset.statusCode).toBe(404)

    const forbiddenLiability = await app.inject({
      method: 'DELETE',
      url: `/api/v1/finance/liabilities/${liabilityId}`,
      headers: headers(otherId),
    })
    expect(forbiddenLiability.statusCode).toBe(404)

    const income = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/income',
      headers: headers(otherId),
    })
    expect(income.json().summary.total).toBe(0)
  })

  it('menghapus transaksi milik sendiri mengurangi agregat', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/expenses',
      headers: headers(ownerId),
    })
    const transactionId = before.json().items[0].id

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/finance/transactions/${transactionId}`,
      headers: headers(ownerId),
    })
    expect(deleted.statusCode).toBe(200)

    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/expenses',
      headers: headers(ownerId),
    })
    expect(after.json().summary.total).toBe(0)

    const budget = await app.inject({
      method: 'GET',
      url: '/api/v1/finance/budgets',
      headers: headers(ownerId),
    })
    expect(budget.json().items[0].spent).toBe(0)
  })
})