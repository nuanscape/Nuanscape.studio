import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

process.env.AGENT_RUNTIME = 'deterministic'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `monitor-test-${suffix}@nuanscape.test`
let ownerId = ''
let automationId = ''
let notifId = ''
let reportId = ''

function headers(id: string) {
  return { 'x-owner-id': id }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Monitor Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  // Seed sample data for office & team metrics
  await prisma.financeTransaction.create({
    data: {
      ownerId,
      type: 'income',
      category: 'Marketplace',
      description: 'Penjualan Batch 1',
      amount: 5000000,
      date: new Date(),
      account: 'Business',
    },
  })
  await prisma.financeTransaction.create({
    data: {
      ownerId,
      type: 'expense',
      category: 'Operational',
      description: 'Server & domain',
      amount: 1500000,
      date: new Date(),
      account: 'Business',
    },
  })
  await prisma.financeBudget.create({
    data: {
      ownerId,
      category: 'Operational',
      limitAmount: 3000000,
    },
  })

  await prisma.product.create({
    data: {
      ownerId,
      name: 'Test Desk Mat',
      sku: `MAT-${suffix}`,
      price: 150000,
      cost: 75000,
      stock: 5,
      minStock: 10,
      category: 'Desk Accessories',
      status: 'Active',
      marketplace: 'Shopee',
    },
  })
  await prisma.order.create({
    data: {
      ownerId,
      id: `ord-${suffix}-1`,
      productName: 'Test Desk Mat',
      customer: 'Budi Santoso',
      qty: 1,
      total: 150000,
      status: 'Pending',
      marketplace: 'Shopee',
      createdAt: new Date(),
    },
  })

  await prisma.contentItem.create({
    data: {
      ownerId,
      title: 'Shorts: 3 Tips Workspace Minimalis',
      platform: 'YouTube',
      niche: 'Productivity',
      format: 'short',
      status: 'Published',
      scheduledAt: new Date(),
    },
  })
  await prisma.contentItem.create({
    data: {
      ownerId,
      title: 'Review Setup Muhe Studio',
      platform: 'YouTube',
      niche: 'Tech',
      format: 'long',
      status: 'Draft',
      scheduledAt: new Date(),
    },
  })
  await prisma.contentEnergy.create({
    data: {
      ownerId,
      current: 90,
      max: 100,
    },
  })

  // Sample automation
  const au = await prisma.automation.create({
    data: {
      ownerId,
      name: 'Test Stock Watchdog',
      module: 'Shop',
      description: 'Memantau stok kritis secara berkala',
      status: 'needs_approval',
      trigger: 'Setiap 2 jam',
      steps: ['Cek stok', 'Kalkulasi kebutuhan', 'Kirim sinyal'],
      runs: 10,
      successRate: 100,
      lastRun: new Date(),
    },
  })
  automationId = au.id

  // Sample notification
  const notif = await prisma.appNotification.create({
    data: {
      ownerId,
      title: 'Peringatan Stok',
      message: 'Stok Test Desk Mat kritis.',
      type: 'shop',
      read: false,
    },
  })
  notifId = notif.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: ownerId } })
  await app.close()
})

describe('Monitor M5 - Command Center & Team Overviews', () => {
  it('GET /monitor/office - mengembalikan ringkasan 3 unit bisnis dan pulse', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/monitor/office',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()

    // Seller
    expect(json.seller.totalOrders).toBe(1)
    expect(json.seller.pendingOrdersCount).toBe(1)
    expect(json.seller.lowStockCount).toBe(1)
    expect(json.seller.revenue).toBe(150000)

    // Finance
    expect(json.finance.income).toBe(5000000)
    expect(json.finance.expense).toBe(1500000)
    expect(json.finance.net).toBe(3500000)
    expect(json.finance.totalTransactions).toBe(2)

    // Content
    expect(json.content.totalItems).toBe(2)
    expect(json.content.publishedCount).toBe(1)
    expect(json.content.energy.current).toBe(90)

    // Pulse
    expect(json.pulse.totalAutomations).toBe(1)
    expect(json.pulse.needsApprovalAutomations).toBe(1)
    expect(json.pulse.unreadNotifications).toBe(1)
  })

  it('GET /monitor/team - mengembalikan 4 profil agen dengan KPI & energy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/monitor/team',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const agents = res.json().agents
    expect(agents.length).toBe(4)

    const muhe = agents.find((a: { id: string }) => a.id === 'muhe')
    const asep = agents.find((a: { id: string }) => a.id === 'asep')
    const ucup = agents.find((a: { id: string }) => a.id === 'ucup')
    const bambang = agents.find((a: { id: string }) => a.id === 'bambang')

    expect(muhe).toBeDefined()
    expect(muhe.role).toBe('Head Agent')
    expect(asep.role).toBe('Finance Agent')
    expect(ucup.role).toBe('Seller Agent')
    expect(bambang.role).toBe('Content Agent')

    expect(typeof muhe.energy).toBe('number')
    expect(typeof asep.energy).toBe('number')
    expect(typeof ucup.energy).toBe('number')
    expect(typeof bambang.energy).toBe('number')
  })
})

describe('Monitor M5 - Automations Lifecycle & Approval', () => {
  it('GET /automations - daftar alur otomatisasi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/automations',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const automations = res.json().automations
    expect(automations.length).toBeGreaterThanOrEqual(1)
    expect(automations.some((a: { id: string }) => a.id === automationId)).toBe(true)
  })

  it('GET /automations/:id - detail alur dengan runsHistory', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/automations/${automationId}`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const au = res.json().automation
    expect(au.id).toBe(automationId)
    expect(Array.isArray(au.runsHistory)).toBe(true)
  })

  it('POST /automations/:id/run - jalankan otomatisasi saat ini', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/automations/${automationId}/run`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.run.status).toBe('success')
    expect(json.automation.runs).toBe(11)
    expect(json.automation.status).toBe('active')
  })

  it('POST /automations/:id/toggle - toggle alur ke paused lalu kembali ke active', async () => {
    // Toggle active -> paused
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/automations/${automationId}/toggle`,
      headers: headers(ownerId),
    })
    expect(res1.statusCode).toBe(200)
    expect(res1.json().automation.status).toBe('paused')

    // Toggle paused -> active
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/v1/automations/${automationId}/toggle`,
      headers: headers(ownerId),
    })
    expect(res2.statusCode).toBe(200)
    expect(res2.json().automation.status).toBe('active')
  })

  it('POST /automations/batch-approve - setujui alur needs_approval', async () => {
    const pendingAu = await prisma.automation.create({
      data: {
        ownerId,
        name: 'Pending Auto Script',
        module: 'Content',
        description: 'Auto skrip butuh approval',
        status: 'needs_approval',
        trigger: 'Ide selesai',
        steps: ['Draft', 'Quality'],
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/automations/batch-approve',
      headers: headers(ownerId),
      payload: { ids: [pendingAu.id] },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().count).toBe(1)

    const check = await prisma.automation.findUnique({ where: { id: pendingAu.id } })
    expect(check?.status).toBe('active')
  })
})

describe('Monitor M5 - Notifications Inbox', () => {
  it('GET /notifications - daftar notifikasi dengan hitungan unread', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.unreadCount).toBeGreaterThanOrEqual(1)
    expect(json.notifications.some((n: { id: string }) => n.id === notifId)).toBe(true)
  })

  it('POST /notifications/:id/read - tandai 1 notifikasi dibaca', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/notifications/${notifId}/read`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().notification.read).toBe(true)
  })

  it('POST /notifications/read-all - tandai semua notifikasi dibaca', async () => {
    // Buat notifikasi baru belum dibaca
    await prisma.appNotification.create({
      data: {
        ownerId,
        title: 'Notif Baru',
        message: 'Info baru',
        type: 'ai',
        read: false,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().updated).toBeGreaterThanOrEqual(1)

    const unread = await prisma.appNotification.count({ where: { ownerId, read: false } })
    expect(unread).toBe(0)
  })
})

describe('Monitor M5 - Briefing Reports', () => {
  it('POST /monitor/reports/generate - Muhe menyusun briefing report baru', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/monitor/reports/generate',
      headers: headers(ownerId),
      payload: { period: 'daily' },
    })
    expect(res.statusCode).toBe(201)
    const rep = res.json().report
    expect(rep.title).toContain('Executive Briefing Harian')
    expect(rep.period).toBe('daily')
    expect(Array.isArray(rep.highlights)).toBe(true)
    expect(rep.highlights.length).toBeGreaterThan(0)
    expect(rep.metrics).toBeDefined()
    reportId = rep.id
  })

  it('GET /monitor/reports/:id - ambil detail laporan briefing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/monitor/reports/${reportId}`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().report.id).toBe(reportId)
  })
})

describe('Monitor M5 - Head Agent Settings & Provider Test', () => {
  it('GET /monitor/settings - ambil konfigurasi head agent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/monitor/settings',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const cfg = res.json().config
    expect(cfg.primaryProvider).toBe('kie.ai')
    expect(cfg.fallbackProvider).toBe('nvidia')
  })

  it('PUT /monitor/settings - ubah konfigurasi head agent', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/monitor/settings',
      headers: headers(ownerId),
      payload: {
        autoApproval: true,
        dailyBriefingHour: 8,
      },
    })
    expect(res.statusCode).toBe(200)
    const cfg = res.json().config
    expect(cfg.autoApproval).toBe(true)
    expect(cfg.dailyBriefingHour).toBe(8)
  })

  it('POST /monitor/settings/test-connection - uji koneksi provider AI', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/monitor/settings/test-connection',
      headers: headers(ownerId),
      payload: {
        provider: 'kie.ai',
        model: 'kimi-k3-1-pro',
      },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.status).toBe('connected')
    expect(json.provider).toBe('kie.ai')
  })
})
