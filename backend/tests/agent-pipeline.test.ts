import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runAgentPipeline } from '../src/agent/pipeline.js'
import { buildAgentSnapshot } from '../src/agent/snapshot.js'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

process.env.AGENT_RUNTIME = 'deterministic'

describe('Agent Pipeline & Snapshot Integration', () => {
  const suffix = randomUUID().slice(0, 8)
  const ownerId = `usr-pipeline-${suffix}`
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    await prisma.user.create({
      data: {
        id: ownerId,
        email: `pipeline-${suffix}@nuanscape.studio`,
        passwordHash: 'hashed_password',
        name: 'Pipeline Tester',
        role: 'owner',
      },
    })

    // Seed mock data
    await prisma.financeTransaction.createMany({
      data: [
        {
          ownerId,
          type: 'income',
          category: 'Penjualan',
          description: 'Penjualan Batch 1',
          amount: 15_000_000,
          date: new Date('2026-11-01'),
          account: 'Business',
        },
        {
          ownerId,
          type: 'expense',
          category: 'Ads',
          description: 'Meta Ads',
          amount: 4_500_000,
          date: new Date('2026-11-02'),
          account: 'Business',
        },
      ],
    })

    await prisma.financeBudget.create({
      data: {
        ownerId,
        category: 'Ads',
        limitAmount: 4_000_000,
      },
    })

    await prisma.financeGoal.create({
      data: {
        ownerId,
        name: 'Dana Darurat',
        target: 20_000_000,
        saved: 10_500_000,
        deadline: new Date('2026-12-31'),
        color: '#F5D64B',
      },
    })

    await prisma.product.create({
      data: {
        ownerId,
        sku: `SKU-PIPE-${suffix}`,
        name: 'Meja Kerja Ergonomis',
        category: 'Furniture',
        price: 1_200_000,
        cost: 700_000,
        stock: 3,
        minStock: 5,
      },
    })

    await prisma.order.create({
      data: {
        id: `ord-pipe-${suffix}`,
        ownerId,
        customer: 'Budi Santoso',
        productName: 'Meja Kerja Ergonomis',
        qty: 2,
        total: 2_400_000,
        status: 'Completed',
        marketplace: 'Shopee',
        date: new Date('2026-11-05'),
      },
    })

    await prisma.contentItem.create({
      data: {
        ownerId,
        title: 'Review Meja Kerja 2026',
        platform: 'YouTube',
        niche: 'Creative',
        format: 'long',
        status: 'Published',
        scheduledAt: new Date('2026-11-10'),
        views: 48_200,
        engagement: 9.1,
      },
    })

    await prisma.appNotification.create({
      data: {
        ownerId,
        title: 'Ringkasan sebelumnya',
        message: 'Budget Ads mendekati batas.',
        type: 'finance',
      },
    })

    await prisma.automation.create({
      data: {
        id: `auto-pipe-${suffix}`,
        ownerId,
        name: 'Audit Inventori & Ads',
        module: 'Finance',
        description: 'Deteksi pengeluaran iklan over budget.',
        status: 'active',
        trigger: 'Setiap Hari',
        steps: ['Kirim Notifikasi'],
      },
    })
  })

  afterAll(async () => {
    await prisma.automationRun.deleteMany({ where: { ownerId } })
    await prisma.automation.deleteMany({ where: { ownerId } })
    await prisma.appNotification.deleteMany({ where: { ownerId } })
    await prisma.briefingReport.deleteMany({ where: { ownerId } })
    await prisma.contentItem.deleteMany({ where: { ownerId } })
    await prisma.order.deleteMany({ where: { ownerId } })
    await prisma.product.deleteMany({ where: { ownerId } })
    await prisma.financeGoal.deleteMany({ where: { ownerId } })
    await prisma.financeBudget.deleteMany({ where: { ownerId } })
    await prisma.financeTransaction.deleteMany({ where: { ownerId } })
    await prisma.user.deleteMany({ where: { id: ownerId } })
    await app.close()
  })

  it('buildAgentSnapshot mengompilasi data bisnis dengan akurat', async () => {
    const snapshot = await buildAgentSnapshot(ownerId, 'Nuanscape Studio')
    expect(snapshot.workspace).toBe('Nuanscape Studio')
    expect(snapshot.finance.summary.income).toBe(15_000_000)
    expect(snapshot.finance.summary.expense).toBe(4_500_000)
    expect(snapshot.finance.summary.net).toBe(10_500_000)
    expect(snapshot.finance.budgets[0]?.category).toBe('Ads')
    expect(snapshot.finance.budgets[0]?.spent).toBe(4_500_000)
    expect(snapshot.seller.criticalStock.length).toBe(1)
    expect(snapshot.seller.criticalStock[0]?.name).toBe('Meja Kerja Ergonomis')
    expect(snapshot.content.summary.published).toBe(1)
    expect(snapshot.content.summary.engagement).toBe(9.1)
    expect(snapshot.content.topContent[0]?.views).toBe(48_200)
    expect(snapshot.content.topContent[0]?.engagement).toBe(9.1)
    expect(snapshot.memory.recentNotifications.length).toBeGreaterThanOrEqual(1)
    expect(snapshot.memory.recentNotifications[0]?.title).toBe('Ringkasan sebelumnya')
  })

  it('runAgentPipeline mengeksekusi pipeline dan membuat notifikasi', async () => {
    const output = await runAgentPipeline(ownerId, {
      module: 'Finance',
      createNotifications: true,
    })
    expect(output.runId).toContain('run-')
    expect(output.result.summary.length).toBeGreaterThan(10)
    expect(output.result.findings.length).toBeGreaterThanOrEqual(1)

    const notifs = await prisma.appNotification.findMany({ where: { ownerId } })
    expect(notifs.length).toBeGreaterThanOrEqual(1)
  })

  it('POST /automations/:id/run menjalankan alur dengan enrichment hasil agen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/automations/auto-pipe-${suffix}/run`,
      headers: { 'x-owner-id': ownerId },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.run.status).toBe('success')
    expect(json.run.summary).toContain('[Muhe]')
    expect(json.automation.runs).toBe(1)
  })

  it('POST /monitor/reports/generate menghasilkan laporan briefing dengan sintesis agen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/monitor/reports/generate',
      headers: { 'x-owner-id': ownerId },
      payload: { period: 'daily' },
    })
    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.report.title).toContain('Executive Briefing Harian')
    expect(json.report.highlights.length).toBeGreaterThanOrEqual(1)
    expect(json.report.content).toContain('Muhe')
  })
})
