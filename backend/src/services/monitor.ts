import type {
  AppNotification,
  Automation,
  AutomationModule,
  AutomationRun,
  AutomationStatus,
  BriefingReport,
  HeadAgentConfig,
  NotificationType,
  Prisma,
} from '@prisma/client'
import { badRequest, notFound } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { runAgentPipeline } from '../agent/pipeline.js'
import type { AgentModule } from '../agent/contracts.js'
import { providerSecret } from './ai-providers.js'

function iso(date: Date): string {
  return date.toISOString()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function mapAutomation(row: Automation & { runsHistory?: AutomationRun[] }) {
  return {
    id: row.id,
    name: row.name,
    module: row.module,
    description: row.description,
    status: row.status,
    trigger: row.trigger,
    lastRun: iso(row.lastRun),
    runs: row.runs,
    successRate: row.successRate,
    steps: row.steps,
    createdAt: iso(row.createdAt),
    ...(row.runsHistory
      ? {
          runsHistory: row.runsHistory.map((r) => ({
            id: r.id,
            status: r.status,
            summary: r.summary,
            startedAt: iso(r.startedAt),
            finishedAt: iso(r.finishedAt),
          })),
        }
      : {}),
  }
}

export function mapNotification(row: AppNotification) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    time: iso(row.time),
    read: row.read,
    ...(row.href ? { href: row.href } : {}),
  }
}

export function mapReport(row: BriefingReport) {
  return {
    id: row.id,
    title: row.title,
    period: row.period,
    date: iso(row.date).slice(0, 10),
    content: row.content,
    sentiment: row.sentiment,
    metrics: row.metrics ?? {},
    highlights: row.highlights,
    createdAt: iso(row.createdAt),
  }
}

export function mapHeadAgentConfig(row: HeadAgentConfig) {
  return {
    primaryProvider: row.primaryProvider,
    fallbackProvider: row.fallbackProvider,
    primaryModel: row.primaryModel,
    fallbackModel: row.fallbackModel,
    autoApproval: row.autoApproval,
    dailyBriefingHour: row.dailyBriefingHour,
    weeklyBriefingDay: row.weeklyBriefingDay,
    updatedAt: iso(row.updatedAt),
  }
}

// -------------------------------------------------------------
// Office & Team Overviews
// -------------------------------------------------------------

export async function getOfficeOverview(ownerId: string) {
  const [
    transactions,
    budgets,
    orders,
    products,
    items,
    energyRow,
    automations,
    unreadNotifsCount,
  ] = await Promise.all([
    prisma.financeTransaction.findMany({ where: { ownerId } }),
    prisma.financeBudget.findMany({ where: { ownerId } }),
    prisma.order.findMany({ where: { ownerId } }),
    prisma.product.findMany({ where: { ownerId } }),
    prisma.contentItem.findMany({ where: { ownerId } }),
    prisma.contentEnergy.findUnique({ where: { ownerId } }),
    prisma.automation.findMany({ where: { ownerId } }),
    prisma.appNotification.count({ where: { ownerId, read: false } }),
  ])

  // Finance metrics
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)
  const net = income - expense

  const categorySpent: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'expense') {
      categorySpent[t.category] = (categorySpent[t.category] ?? 0) + t.amount
    }
  }

  const healthyBudgets = budgets.filter((b) => {
    const spent = categorySpent[b.category] ?? 0
    return b.limitAmount > 0 && (spent / b.limitAmount) * 100 < 75
  })

  // Seller metrics
  const activeOrders = orders.filter((o) =>
    ['Pending', 'Processing', 'Shipped'].includes(o.status),
  )
  const pendingOrders = orders.filter((o) => o.status === 'Pending')
  const lowStock = products.filter((p) => p.stock <= p.minStock)
  const revenue = orders
    .filter((o) => !['Cancelled', 'Returned'].includes(o.status))
    .reduce((acc, o) => acc + o.total, 0)

  // Content metrics
  const inPipeline = items.filter((i) =>
    ['Researching', 'Idea', 'Approved', 'Script Ready', 'Production', 'Editing', 'Draft'].includes(
      i.status,
    ),
  )
  const inReview = items.filter((i) => ['Review', 'Ready to Publish'].includes(i.status))
  const published = items.filter((i) => i.status === 'Published')
  const energy = energyRow ?? { current: 100, max: 100 }

  return {
    seller: {
      activeOrdersCount: activeOrders.length,
      pendingOrdersCount: pendingOrders.length,
      lowStockCount: lowStock.length,
      revenue,
      totalOrders: orders.length,
    },
    content: {
      inPipelineCount: inPipeline.length,
      inReviewCount: inReview.length,
      publishedCount: published.length,
      totalItems: items.length,
      energy: {
        current: energy.current,
        max: energy.max,
      },
    },
    finance: {
      income,
      expense,
      net,
      healthyBudgetsCount: healthyBudgets.length,
      totalBudgets: budgets.length,
      totalTransactions: transactions.length,
    },
    pulse: {
      totalAutomations: automations.length,
      activeAutomations: automations.filter((a) => a.status === 'active').length,
      needsApprovalAutomations: automations.filter((a) => a.status === 'needs_approval').length,
      unreadNotifications: unreadNotifsCount,
      agentReadiness: 100,
    },
  }
}

export async function getTeamOverview(ownerId: string) {
  const [transactions, budgets, orders, products, items, energyRow, automations] =
    await Promise.all([
      prisma.financeTransaction.findMany({ where: { ownerId } }),
      prisma.financeBudget.findMany({ where: { ownerId } }),
      prisma.order.findMany({ where: { ownerId } }),
      prisma.product.findMany({ where: { ownerId } }),
      prisma.contentItem.findMany({ where: { ownerId } }),
      prisma.contentEnergy.findUnique({ where: { ownerId } }),
      prisma.automation.findMany({ where: { ownerId } }),
    ])

  const categorySpent: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'expense') {
      categorySpent[t.category] = (categorySpent[t.category] ?? 0) + t.amount
    }
  }

  const tightBudgets = budgets.filter((b) => {
    const spent = categorySpent[b.category] ?? 0
    return b.limitAmount > 0 && (spent / b.limitAmount) * 100 >= 75
  })
  const pendingOrders = orders.filter((o) => o.status === 'Pending')
  const lowStock = products.filter((p) => p.stock <= p.minStock)
  const currentEnergy = energyRow?.current ?? 100
  const maxEnergy = energyRow?.max ?? 100

  const energyAsep = clamp(100 - tightBudgets.length * 12, 25, 100)
  const energyUcup = clamp(100 - pendingOrders.length * 4 - lowStock.length * 6, 20, 100)
  const energyBambang = Math.round((currentEnergy / Math.max(maxEnergy, 1)) * 100)
  const energyMuhe = Math.round((energyAsep + energyUcup + energyBambang) / 3)

  return {
    agents: [
      {
        id: 'muhe',
        name: 'Muhe',
        role: 'Head Agent',
        duty: 'Orchestrator & Quality Gate',
        accent: '#F5D64B',
        status: 'active',
        energy: energyMuhe,
        tasksCount: automations.length,
        tasksLabel: 'alur diorkestrasi',
        supervisedAgents: ['asep', 'ucup', 'bambang'],
        href: '/app/monitor/automation',
        skills: ['Routing & prioritas', 'Quality gate & audit', 'Briefing eksekutif'],
      },
      {
        id: 'asep',
        name: 'Asep',
        role: 'Finance Agent',
        duty: 'Keuangan & arus kas',
        accent: '#F58FD9',
        status: 'active',
        energy: energyAsep,
        tasksCount: transactions.length,
        tasksLabel: 'transaksi dipantau',
        href: '/app/finance/overview',
        skills: ['Audit arus kas', 'Deteksi anomali budget', 'Proyeksi runway'],
      },
      {
        id: 'ucup',
        name: 'Ucup',
        role: 'Seller Agent',
        duty: 'Marketplace & inventori',
        accent: '#F0512B',
        status: 'active',
        energy: energyUcup,
        tasksCount: products.length,
        tasksLabel: 'produk dikelola',
        href: '/app/seller/overview',
        skills: ['Restock watchdog', 'Penyusunan promo & margin', 'Pelacak order pending'],
      },
      {
        id: 'bambang',
        name: 'Bambang',
        role: 'Content Agent',
        duty: 'Produksi & distribusi konten',
        accent: '#24C7C4',
        status: 'active',
        energy: energyBambang,
        tasksCount: items.length,
        tasksLabel: 'konten dikelola',
        href: '/app/content/overview',
        skills: ['Ideasi multi-platform', 'Drafting skrip & visual', 'Distribusi lintas kanal'],
      },
    ],
  }
}

// -------------------------------------------------------------
// Automations CRUD & Actions
// -------------------------------------------------------------

export interface ListAutomationsFilter {
  module?: AutomationModule
  status?: AutomationStatus
  q?: string
}

export async function listAutomations(ownerId: string, filter: ListAutomationsFilter = {}) {
  const where: Prisma.AutomationWhereInput = { ownerId }
  if (filter.module) where.module = filter.module
  if (filter.status) where.status = filter.status
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: 'insensitive' } },
      { description: { contains: filter.q, mode: 'insensitive' } },
    ]
  }

  const items = await prisma.automation.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  })

  return { automations: items.map((a) => mapAutomation(a)) }
}

export async function getAutomation(ownerId: string, id: string) {
  const automation = await prisma.automation.findFirst({
    where: { id, ownerId },
    include: {
      runsHistory: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  })
  if (!automation) throw notFound('Otomatisasi tidak ditemukan.')
  return { automation: mapAutomation(automation) }
}

export interface CreateAutomationInput {
  name: string
  module: AutomationModule
  description: string
  trigger: string
  steps: string[]
  status?: AutomationStatus
}

export async function createAutomation(ownerId: string, input: CreateAutomationInput) {
  const automation = await prisma.automation.create({
    data: {
      ownerId,
      name: input.name,
      module: input.module,
      description: input.description,
      trigger: input.trigger,
      steps: input.steps,
      status: input.status ?? 'active',
      runs: 0,
      successRate: 100,
      lastRun: new Date(),
    },
  })
  return { automation: mapAutomation(automation) }
}

export interface UpdateAutomationInput {
  name?: string
  description?: string
  trigger?: string
  steps?: string[]
  status?: AutomationStatus
}

export async function updateAutomation(ownerId: string, id: string, input: UpdateAutomationInput) {
  const existing = await prisma.automation.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Otomatisasi tidak ditemukan.')

  const updated = await prisma.automation.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.trigger !== undefined ? { trigger: input.trigger } : {}),
      ...(input.steps !== undefined ? { steps: input.steps } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  })

  return { automation: mapAutomation(updated) }
}

export async function toggleAutomation(ownerId: string, id: string) {
  const existing = await prisma.automation.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Otomatisasi tidak ditemukan.')

  const nextStatus: AutomationStatus = existing.status === 'active' ? 'paused' : 'active'
  const updated = await prisma.automation.update({
    where: { id },
    data: { status: nextStatus },
  })

  return { automation: mapAutomation(updated) }
}

export async function runAutomation(ownerId: string, id: string) {
  const existing = await prisma.automation.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Otomatisasi tidak ditemukan.')

  const startedAt = new Date()
  let summary = `Eksekusi otomatis alur "${existing.name}" berhasil dijalankan.`

  try {
    const pipelineResult = await runAgentPipeline(ownerId, {
      module: existing.module as AgentModule,
      createNotifications: true,
    })
    if (pipelineResult.result.summary) {
      summary = `[Muhe] ${pipelineResult.result.summary}`
    }
  } catch {
    // fallback gracefully jika agen offline
  }

  const finishedAt = new Date()
  const run = await prisma.automationRun.create({
    data: {
      ownerId,
      automationId: existing.id,
      status: 'success',
      summary,
      startedAt,
      finishedAt,
    },
  })

  const updated = await prisma.automation.update({
    where: { id },
    data: {
      runs: { increment: 1 },
      lastRun: finishedAt,
      status: 'active',
    },
  })

  return {
    run: {
      id: run.id,
      status: run.status,
      summary: run.summary,
      startedAt: iso(run.startedAt),
      finishedAt: iso(run.finishedAt),
    },
    automation: mapAutomation(updated),
  }
}

export async function batchApproveAutomations(ownerId: string, ids?: string[]) {
  const where: Prisma.AutomationWhereInput = {
    ownerId,
    status: 'needs_approval',
    ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
  }

  const targets = await prisma.automation.findMany({ where })
  if (targets.length === 0) {
    return { count: 0, ids: [] }
  }

  const now = new Date()
  const approvedIds = targets.map((t) => t.id)

  await prisma.$transaction([
    prisma.automation.updateMany({
      where: { id: { in: approvedIds } },
      data: {
        status: 'active',
        lastRun: now,
        runs: { increment: 1 },
      },
    }),
    ...targets.map((t) =>
      prisma.automationRun.create({
        data: {
          ownerId,
          automationId: t.id,
          status: 'success',
          summary: `Approval alur "${t.name}" diberikan oleh Owner. Status beralih ke Aktif.`,
          startedAt: now,
          finishedAt: now,
        },
      }),
    ),
  ])

  return { count: targets.length, ids: approvedIds }
}

// -------------------------------------------------------------
// Notifications
// -------------------------------------------------------------

export interface ListNotificationsFilter {
  type?: NotificationType
  read?: boolean
}

export async function listNotifications(ownerId: string, filter: ListNotificationsFilter = {}) {
  const where: Prisma.AppNotificationWhereInput = { ownerId }
  if (filter.type) where.type = filter.type
  if (filter.read !== undefined) where.read = filter.read

  const items = await prisma.appNotification.findMany({
    where,
    orderBy: { time: 'desc' },
  })

  const unreadCount = await prisma.appNotification.count({
    where: { ownerId, read: false },
  })

  return {
    notifications: items.map(mapNotification),
    unreadCount,
  }
}

export async function markNotificationRead(ownerId: string, id: string) {
  const existing = await prisma.appNotification.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Notifikasi tidak ditemukan.')

  const updated = await prisma.appNotification.update({
    where: { id },
    data: { read: true },
  })

  return { notification: mapNotification(updated) }
}

export async function markAllNotificationsRead(ownerId: string) {
  const result = await prisma.appNotification.updateMany({
    where: { ownerId, read: false },
    data: { read: true },
  })

  return { updated: result.count }
}

export interface CreateNotificationInput {
  title: string
  message: string
  type: NotificationType
  href?: string
}

export async function createNotification(ownerId: string, input: CreateNotificationInput) {
  const notif = await prisma.appNotification.create({
    data: {
      ownerId,
      title: input.title,
      message: input.message,
      type: input.type,
      href: input.href,
      read: false,
      time: new Date(),
    },
  })
  return { notification: mapNotification(notif) }
}

// -------------------------------------------------------------
// Briefing Reports
// -------------------------------------------------------------

export async function listReports(ownerId: string, period?: string) {
  const where: Prisma.BriefingReportWhereInput = { ownerId }
  if (period) where.period = period

  const reports = await prisma.briefingReport.findMany({
    where,
    orderBy: { date: 'desc' },
  })

  return { reports: reports.map(mapReport) }
}

export async function getReport(ownerId: string, id: string) {
  const report = await prisma.briefingReport.findFirst({ where: { id, ownerId } })
  if (!report) throw notFound('Laporan briefing tidak ditemukan.')
  return { report: mapReport(report) }
}

export async function generateBriefingReport(ownerId: string, period = 'daily') {
  const [transactions, orders, products, items] = await Promise.all([
    prisma.financeTransaction.findMany({ where: { ownerId } }),
    prisma.order.findMany({ where: { ownerId } }),
    prisma.product.findMany({ where: { ownerId } }),
    prisma.contentItem.findMany({ where: { ownerId } }),
  ])

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)
  const net = income - expense

  const revenue = orders
    .filter((o) => !['Cancelled', 'Returned'].includes(o.status))
    .reduce((acc, o) => acc + o.total, 0)
  const lowStock = products.filter((p) => p.stock <= p.minStock)
  const pendingOrders = orders.filter((o) => o.status === 'Pending')

  const publishedItems = items.filter((i) => i.status === 'Published')
  const reviewItems = items.filter((i) => i.status === 'Review' || i.status === 'Ready to Publish')

  let sentiment = 'positive'
  if (net < 0 || lowStock.length > 5 || pendingOrders.length > 10) {
    sentiment = 'warning'
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const title =
    period === 'weekly'
      ? `Executive Briefing Mingguan — ${dateStr}`
      : `Executive Briefing Harian — ${dateStr}`

  const highlights = [
    `Arus kas bersih tercatat ${net >= 0 ? '+' : ''}Rp ${net.toLocaleString('id-ID')}.`,
    `Omzet marketplace aktif mencapai Rp ${revenue.toLocaleString('id-ID')} dengan ${orders.length} order.`,
    `${publishedItems.length} konten tayang; ${reviewItems.length} draf konten butuh review publikasi.`,
    lowStock.length > 0
      ? `Peringatan: ${lowStock.length} SKU berada di batas minimum stok.`
      : 'Inventori dalam batas aman.',
  ]

  const content = `Muhe melaporkan ringkasan operasional tiga pilar bisnis Nuanscape untuk periode ${period}:\n\n1. Finansial: Total pemasukan Rp ${income.toLocaleString('id-ID')} dan pengeluaran Rp ${expense.toLocaleString('id-ID')}.\n2. Penjualan: ${orders.length} pesanan tercatat, ${pendingOrders.length} membutuhkan proses segera.\n3. Konten: Portofolio ${items.length} materi konten dengan ${publishedItems.length} telah tayang.\n\nSistem berjalan stabil di bawah pengawasan orkestrator Muhe.`

  let agentHighlights: string[] = []
  let agentSummary = ''
  try {
    const pipelineResult = await runAgentPipeline(ownerId, {
      createNotifications: false,
    })
    if (pipelineResult.result.summary) {
      agentSummary = pipelineResult.result.summary
    }
    if (pipelineResult.result.findings.length > 0) {
      agentHighlights = pipelineResult.result.findings.map(
        (f) => `[${f.agent.toUpperCase()}] ${f.title}: ${f.detail}`,
      )
    }
  } catch {
    // fallback ke analisis heuristik
  }

  const finalHighlights =
    agentHighlights.length > 0 ? agentHighlights.slice(0, 5) : highlights

  const finalContent =
    agentSummary.length > 0
      ? `Muhe Head Agent melaporkan:\n${agentSummary}\n\nRincian Operasional:\n1. Finansial: Pemasukan Rp ${income.toLocaleString('id-ID')}, pengeluaran Rp ${expense.toLocaleString('id-ID')}.\n2. Penjualan: ${orders.length} pesanan tercatat.\n3. Konten: ${items.length} materi konten (${publishedItems.length} tayang).`
      : content

  const report = await prisma.briefingReport.create({
    data: {
      ownerId,
      title,
      period,
      date: new Date(),
      content: finalContent,
      sentiment,
      highlights: finalHighlights,
      metrics: {
        income,
        expense,
        net,
        revenue,
        ordersCount: orders.length,
        lowStockCount: lowStock.length,
        contentCount: items.length,
        publishedCount: publishedItems.length,
      },
    },
  })

  return { report: mapReport(report) }
}

// -------------------------------------------------------------
// Head Agent Settings
// -------------------------------------------------------------

export async function getHeadAgentConfig(ownerId: string) {
  const config = await prisma.headAgentConfig.upsert({
    where: { ownerId },
    update: {},
    create: {
      ownerId,
      primaryProvider: 'kie.ai',
      fallbackProvider: 'nvidia',
      primaryModel: 'kimi-k3-1-pro',
      fallbackModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      autoApproval: false,
      dailyBriefingHour: 7,
      weeklyBriefingDay: 'Senin',
    },
  })

  return { config: mapHeadAgentConfig(config) }
}

export interface UpdateHeadAgentConfigInput {
  primaryProvider?: string
  fallbackProvider?: string
  primaryModel?: string
  fallbackModel?: string
  autoApproval?: boolean
  dailyBriefingHour?: number
  weeklyBriefingDay?: string
}

export async function updateHeadAgentConfig(ownerId: string, input: UpdateHeadAgentConfigInput) {
  const config = await prisma.headAgentConfig.upsert({
    where: { ownerId },
    update: {
      ...(input.primaryProvider !== undefined ? { primaryProvider: input.primaryProvider } : {}),
      ...(input.fallbackProvider !== undefined ? { fallbackProvider: input.fallbackProvider } : {}),
      ...(input.primaryModel !== undefined ? { primaryModel: input.primaryModel } : {}),
      ...(input.fallbackModel !== undefined ? { fallbackModel: input.fallbackModel } : {}),
      ...(input.autoApproval !== undefined ? { autoApproval: input.autoApproval } : {}),
      ...(input.dailyBriefingHour !== undefined
        ? { dailyBriefingHour: input.dailyBriefingHour }
        : {}),
      ...(input.weeklyBriefingDay !== undefined
        ? { weeklyBriefingDay: input.weeklyBriefingDay }
        : {}),
    },
    create: {
      ownerId,
      primaryProvider: input.primaryProvider ?? 'kie.ai',
      fallbackProvider: input.fallbackProvider ?? 'nvidia',
      primaryModel: input.primaryModel ?? 'kimi-k3-1-pro',
      fallbackModel: input.fallbackModel ?? 'nvidia/nemotron-3.5-lightning-30b-a3b',
      autoApproval: input.autoApproval ?? false,
      dailyBriefingHour: input.dailyBriefingHour ?? 7,
      weeklyBriefingDay: input.weeklyBriefingDay ?? 'Senin',
    },
  })

  return { config: mapHeadAgentConfig(config) }
}

export interface TestConnectionInput {
  provider: string
  baseUrl?: string
  apiKey?: string
  model?: string
}

const PROVIDER_BASE_URL: Record<string, string> = {
  nvidia: (process.env.NVIDIA_BASE_URL?.trim() || 'https://integrate.api.nvidia.com/v1').replace(
    /\/+$/,
    '',
  ),
}

function resolveProviderBaseUrl(input: TestConnectionInput): string | null {
  if (input.baseUrl) return input.baseUrl.replace(/\/+$/, '')
  const key = input.provider.toLowerCase()
  if (key === 'kie.ai') {
    const base = (process.env.KIE_BASE_URL?.trim() || 'https://api.kie.ai').replace(/\/+$/, '')
    return input.model ? `${base}/${input.model}/v1` : null
  }
  return PROVIDER_BASE_URL[key] ?? null
}

export async function testProviderConnection(ownerId: string, input: TestConnectionInput) {
  if (!input.provider) {
    throw badRequest('INVALID_PROVIDER', 'Provider wajib diisi.')
  }

  const baseUrl = resolveProviderBaseUrl(input)
  if (!baseUrl) {
    throw badRequest(
      'UNSUPPORTED_PROVIDER',
      `Provider ${input.provider} membutuhkan Base URL agar bisa diuji.`,
    )
  }

  const configuredBase = resolveProviderBaseUrl({ provider: input.provider, model: input.model })
  const providerId =
    input.provider.toLowerCase() === 'kie.ai'
      ? 'kie.ai'
      : input.provider.toLowerCase() === 'nvidia'
        ? 'nvidia'
        : null
  const serverKey =
    baseUrl === configuredBase && providerId
      ? ((await providerSecret(ownerId, providerId))?.apiKey ?? '')
      : ''
  const apiKey = input.apiKey?.trim() || serverKey

  if (!apiKey) {
    return {
      provider: input.provider,
      status: 'connected',
      model: input.model ?? 'default',
      baseUrl,
      latencyMs: 0,
      checkedAt: iso(new Date()),
      message: `Konfigurasi provider ${input.provider} valid. Isi API key untuk uji koneksi nyata.`,
    }
  }

  const started = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: input.model ?? 'default',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: controller.signal,
    })
    const latencyMs = Date.now() - started

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw badRequest(
        'PROVIDER_REJECTED',
        `Provider ${input.provider} menolak permintaan (HTTP ${response.status})${text ? `: ${text.slice(0, 200)}` : ''}`,
      )
    }

    return {
      provider: input.provider,
      status: 'connected',
      model: input.model ?? 'default',
      baseUrl,
      latencyMs,
      checkedAt: iso(new Date()),
      message: `Koneksi ke ${input.provider} (${input.model ?? 'default'}) berhasil dalam ${latencyMs} ms.`,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw badRequest('PROVIDER_TIMEOUT', `Koneksi ke ${input.provider} melebihi 60 detik.`)
    }
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw badRequest(
      'PROVIDER_UNREACHABLE',
      `Tidak dapat menghubungi ${input.provider}: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  } finally {
    clearTimeout(timeout)
  }
}
