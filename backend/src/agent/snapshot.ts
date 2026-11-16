import { prisma } from '../lib/prisma.js'
import {
  buildResearchQueries,
  emptyYouTubeResearch,
  researchYouTube,
  type YouTubeResearchResult,
} from '../services/youtube-research.js'
import { youtubeResearchAuthForOwner } from '../services/youtube.js'

export interface AgentContextSnapshot {
  workspace: string
  generatedAt: string
  finance: {
    summary: {
      income: number
      expense: number
      net: number
      savingsRate: number
    }
    trend: {
      periodDays: number
      current: { income: number; expense: number; net: number }
      previous: { income: number; expense: number; net: number }
      deltaPct: {
        income: number | null
        expense: number | null
        net: number | null
      }
    }
    topCategories: Array<{
      category: string
      amount: number
      sharePct: number
      budgetLimit: number | null
      budgetUsagePct: number | null
    }>
    budgets: Array<{
      category: string
      limit: number
      spent: number
    }>
    goals: Array<{
      name: string
      target: number
      current: number
    }>
    recentExpenses: Array<{
      date: string
      category: string
      amount: number
      account: string
    }>
  }
  seller: {
    metrics: {
      grossRevenue: number
      netProfit: number
      orders: number
      inventoryValue: number
    }
    salesTrend: {
      periodDays: number
      current: { revenue: number; orders: number; units: number; profit: number }
      previous: { revenue: number; orders: number; units: number; profit: number }
      deltaPct: {
        revenue: number | null
        orders: number | null
        units: number | null
        profit: number | null
      }
    }
    productPerformance: Array<{
      sku: string
      name: string
      revenue: number
      units: number
      profit: number
      marginPct: number | null
      stock: number
      minStock: number
    }>
    criticalStock: Array<{
      sku: string
      name: string
      stock: number
      minStock: number
    }>
    profitByProduct: Array<{
      sku: string
      name: string
      profit: number
    }>
  }
  content: {
    summary: {
      published: number
      inProduction: number
      ideas: number
      engagement: number
    }
    trend: {
      periodDays: number
      current: { published: number; views: number; engagement: number }
      previous: { published: number; views: number; engagement: number }
      deltaPct: {
        published: number | null
        views: number | null
        engagement: number | null
      }
    }
    platformPerformance: Array<{
      platform: string
      published: number
      views: number
      avgEngagement: number
    }>
    recentContent: Array<{
      title: string
      platform: string
      status: string
      scheduledAt: string
      views: number
      engagement: number
      videoUrl?: string
      youtubeUrl?: string
      publishStatus?: string
    }>
    topContent: Array<{
      title: string
      platform: string
      views: number
      engagement: number
    }>
    pipeline: Array<{
      title: string
      status: string
      platform: string
    }>
    youtubeResearch: YouTubeResearchResult
  }
  dataQuality: {
    financeTransactions: number
    orders: number
    products: number
    contentItems: number
    historicalBaseline: boolean
  }
  memory: {
    recentNotifications: Array<{
      title: string
      message: string
      type: string
      time: string
      read: boolean
    }>
    lastBriefing: {
      title: string
      period: string
      date: string
      sentiment: string
      highlights: string[]
    } | null
  }
}

interface ResearchSource {
  platform: string
  niche: string
  title?: string
}

function pickResearchQueries(
  accounts: ResearchSource[],
  items: ResearchSource[],
  ideas: ResearchSource[],
): string[] {
  const explicit = process.env.YOUTUBE_RESEARCH_QUERY?.trim()
  if (explicit) return [explicit]

  const seeds: string[] = []
  const titles: string[] = []
  for (const source of [...accounts, ...items, ...ideas]) {
    if (source.platform !== 'YouTube') continue
    if (source.niche.trim()) seeds.push(source.niche.trim())
    if (source.title?.trim()) titles.push(source.title.trim())
  }

  return buildResearchQueries(seeds, titles)
}

const PERIOD_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return round1(((current - previous) / previous) * 100)
}

function summarizeFinance(
  rows: Array<{ type: string; amount: number; date: Date }>,
  start: Date,
  end: Date,
): { income: number; expense: number; net: number } {
  let income = 0
  let expense = 0
  for (const row of rows) {
    if (row.date < start || row.date >= end) continue
    if (row.type === 'income') income += row.amount
    if (row.type === 'expense') expense += row.amount
  }
  return { income, expense, net: income - expense }
}

function summarizeOrders(
  rows: Array<{
    total: number
    qty: number
    unitCost: number
    productName: string
    date: Date
  }>,
  start: Date,
  end: Date,
  costByName: Map<string, number>,
): { revenue: number; orders: number; units: number; profit: number } {
  let revenue = 0
  let orders = 0
  let units = 0
  let profit = 0
  for (const row of rows) {
    if (row.date < start || row.date >= end) continue
    const cost = row.unitCost > 0 ? row.unitCost : costByName.get(row.productName) ?? 0
    revenue += row.total
    orders += 1
    units += row.qty
    profit += row.total - cost * row.qty
  }
  return { revenue, orders, units, profit }
}

function summarizePublished(
  items: Array<{ views: number; engagement: number }>,
): { published: number; views: number; engagement: number } {
  const measured = items.filter((item) => item.views > 0)
  return {
    published: items.length,
    views: items.reduce((acc, item) => acc + item.views, 0),
    engagement:
      measured.length > 0
        ? round1(measured.reduce((acc, item) => acc + item.engagement, 0) / measured.length)
        : 0,
  }
}

async function buildSnapshotYouTubeResearch(
  ownerId: string,
  accounts: ResearchSource[],
  items: ResearchSource[],
  ideas: ResearchSource[],
): Promise<YouTubeResearchResult> {
  const queries = pickResearchQueries(accounts, items, ideas)
  const query = queries[0] ?? null
  const enabled = process.env.YOUTUBE_RESEARCH_ENABLED?.trim().toLowerCase() !== 'false'
  if (!enabled) {
    return emptyYouTubeResearch(query, 'Riset YouTube dinonaktifkan lewat YOUTUBE_RESEARCH_ENABLED=false.')
  }
  if (!query) {
    return emptyYouTubeResearch(
      null,
      'Niche YouTube belum tersedia. Hubungkan akun YouTube atau isi YOUTUBE_RESEARCH_QUERY.',
    )
  }
  const auth = await youtubeResearchAuthForOwner(ownerId)
  if (!auth.apiKey && !auth.accessToken) {
    return emptyYouTubeResearch(
      query,
      'Atur YOUTUBE_API_KEY atau hubungkan channel YouTube agar Bambang bisa riset.',
    )
  }
  try {
    return await researchYouTube({ query, queries, ...auth })
  } catch (error) {
    return emptyYouTubeResearch(
      query,
      'Riset YouTube tidak tersedia saat snapshot dibuat.',
      error instanceof Error ? error.message : String(error),
    )
  }
}

export async function buildAgentSnapshot(
  ownerId: string,
  workspaceName = 'Nuanscape Studio',
): Promise<AgentContextSnapshot> {
  const [
    transactions,
    budgets,
    goals,
    products,
    orders,
    contentItems,
    contentIdeas,
    platformAccounts,
    recentNotifications,
    lastBriefing,
  ] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: { ownerId },
      orderBy: { date: 'desc' },
    }),
    prisma.financeBudget.findMany({ where: { ownerId } }),
    prisma.financeGoal.findMany({ where: { ownerId } }),
    prisma.product.findMany({ where: { ownerId } }),
    prisma.order.findMany({ where: { ownerId }, orderBy: { date: 'desc' } }),
    prisma.contentItem.findMany({
      where: { ownerId },
      orderBy: { scheduledAt: 'desc' },
    }),
    prisma.contentIdea.findMany({ where: { ownerId } }),
    prisma.platformAccount.findMany({
      where: { ownerId },
      orderBy: { followers: 'desc' },
    }),
    prisma.appNotification.findMany({
      where: { ownerId },
      orderBy: { time: 'desc' },
      take: 8,
    }),
    prisma.briefingReport.findFirst({
      where: { ownerId },
      orderBy: { date: 'desc' },
    }),
  ])

  const now = new Date()
  const periodStart = new Date(now.getTime() - PERIOD_DAYS * DAY_MS)
  const previousStart = new Date(now.getTime() - 2 * PERIOD_DAYS * DAY_MS)

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)
  const net = income - expense
  const savingsRate = income > 0 ? Math.round(((net / income) * 100) * 10) / 10 : 0

  const financeCurrent = summarizeFinance(transactions, periodStart, now)
  const financePrevious = summarizeFinance(transactions, previousStart, periodStart)

  const spentByCategory = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') {
      spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) + t.amount)
    }
  }

  const budgetByCategory = new Map(budgets.map((b) => [b.category, b.limitAmount]))
  const topCategories = Array.from(spentByCategory.entries())
    .map(([category, amount]) => {
      const budgetLimit = budgetByCategory.get(category) ?? null
      return {
        category,
        amount,
        sharePct: expense > 0 ? round1((amount / expense) * 100) : 0,
        budgetLimit,
        budgetUsagePct:
          budgetLimit && budgetLimit > 0 ? round1((amount / budgetLimit) * 100) : null,
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const budgetList = budgets.map((b) => ({
    category: b.category,
    limit: b.limitAmount,
    spent: spentByCategory.get(b.category) ?? 0,
  }))

  const goalList = goals.map((g) => ({
    name: g.name,
    target: g.target,
    current: g.saved,
  }))

  const recentExpenses = transactions
    .filter((t) => t.type === 'expense')
    .slice(0, 5)
    .map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      category: t.category,
      amount: t.amount,
      account: t.account,
    }))

  const validOrders = orders.filter(
    (o) => !['Cancelled', 'Returned'].includes(o.status),
  )
  const grossRevenue = validOrders.reduce((acc, o) => acc + o.total, 0)
  const inventoryValue = products.reduce((acc, p) => acc + p.stock * p.cost, 0)
  const costMap = new Map(products.map((p) => [p.name, p.cost]))
  const skuMap = new Map(products.map((p) => [p.name, p.sku]))
  const stockMap = new Map(products.map((p) => [p.name, { stock: p.stock, minStock: p.minStock }]))

  const productMap = new Map<
    string,
    { sku: string; name: string; revenue: number; units: number; profit: number }
  >()

  for (const o of validOrders) {
    const fallbackCost = costMap.get(o.productName) ?? 0
    const cost = o.unitCost > 0 ? o.unitCost : fallbackCost
    const profit = o.total - cost * o.qty
    const sku = skuMap.get(o.productName) ?? 'SKU-UNKNOWN'
    const current = productMap.get(o.productName) ?? {
      sku,
      name: o.productName,
      revenue: 0,
      units: 0,
      profit: 0,
    }
    current.revenue += o.total
    current.units += o.qty
    current.profit += profit
    productMap.set(o.productName, current)
  }

  const productPerformance = Array.from(productMap.values())
    .map((product) => {
      const stock = stockMap.get(product.name) ?? { stock: 0, minStock: 0 }
      return {
        ...product,
        marginPct: product.revenue > 0 ? round1((product.profit / product.revenue) * 100) : null,
        stock: stock.stock,
        minStock: stock.minStock,
      }
    })
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue)
    .slice(0, 8)

  const netProfit = Array.from(productMap.values()).reduce(
    (acc, p) => acc + p.profit,
    0,
  )

  const criticalStock = products
    .filter((p) => p.stock <= p.minStock)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
    }))

  const profitByProduct = productPerformance.slice(0, 5).map((product) => ({
    sku: product.sku,
    name: product.name,
    profit: product.profit,
  }))

  const sellerCurrent = summarizeOrders(validOrders, periodStart, now, costMap)
  const sellerPrevious = summarizeOrders(validOrders, previousStart, periodStart, costMap)

  const publishedItems = contentItems.filter((i) => i.status === 'Published')
  const inProductionItems = contentItems.filter((i) =>
    ['Draft', 'In Production', 'Review', 'Ready to Publish'].includes(i.status),
  )
  const activeIdeas = contentIdeas.filter((i) =>
    ['approved', 'in_progress'].includes(i.status),
  )

  const topContent = [...publishedItems]
    .sort((a, b) => b.views - a.views || b.engagement - a.engagement)
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      platform: item.platform,
      views: item.views,
      engagement: item.engagement,
    }))

  const contentSummary = summarizePublished(publishedItems)
  const engagement = contentSummary.engagement

  const platformMap = new Map<
    string,
    { platform: string; published: number; views: number; engagementTotal: number; measured: number }
  >()
  for (const item of publishedItems) {
    const current = platformMap.get(item.platform) ?? {
      platform: item.platform,
      published: 0,
      views: 0,
      engagementTotal: 0,
      measured: 0,
    }
    current.published += 1
    current.views += item.views
    if (item.views > 0) {
      current.engagementTotal += item.engagement
      current.measured += 1
    }
    platformMap.set(item.platform, current)
  }

  const platformPerformance = Array.from(platformMap.values())
    .map((platform) => ({
      platform: platform.platform,
      published: platform.published,
      views: platform.views,
      avgEngagement:
        platform.measured > 0 ? round1(platform.engagementTotal / platform.measured) : 0,
    }))
    .sort((a, b) => b.views - a.views)

  const contentCurrent = summarizePublished(
    publishedItems.filter(
      (item) => item.scheduledAt >= periodStart && item.scheduledAt < now,
    ),
  )
  const contentPrevious = summarizePublished(
    publishedItems.filter(
      (item) => item.scheduledAt >= previousStart && item.scheduledAt < periodStart,
    ),
  )

  const recentContent = contentItems.slice(0, 5).map((item) => ({
    title: item.title,
    platform: item.platform,
    status: item.status,
    scheduledAt: item.scheduledAt.toISOString().slice(0, 10),
    views: item.views,
    engagement: item.engagement,
    ...(item.videoUrl ? { videoUrl: item.videoUrl } : {}),
    ...(item.youtubeUrl ? { youtubeUrl: item.youtubeUrl } : {}),
    ...(item.publishStatus ? { publishStatus: item.publishStatus } : {}),
  }))

  const pipeline = inProductionItems.slice(0, 5).map((item) => ({
    title: item.title,
    status: item.status,
    platform: item.platform,
  }))

  const youtubeResearch = await buildSnapshotYouTubeResearch(
    ownerId,
    platformAccounts,
    contentItems,
    contentIdeas,
  )

  return {
    workspace: workspaceName,
    generatedAt: new Date().toISOString(),
    finance: {
      summary: { income, expense, net, savingsRate },
      trend: {
        periodDays: PERIOD_DAYS,
        current: financeCurrent,
        previous: financePrevious,
        deltaPct: {
          income: pctChange(financeCurrent.income, financePrevious.income),
          expense: pctChange(financeCurrent.expense, financePrevious.expense),
          net: pctChange(financeCurrent.net, financePrevious.net),
        },
      },
      topCategories,
      budgets: budgetList,
      goals: goalList,
      recentExpenses,
    },
    seller: {
      metrics: {
        grossRevenue,
        netProfit,
        orders: validOrders.length,
        inventoryValue,
      },
      salesTrend: {
        periodDays: PERIOD_DAYS,
        current: sellerCurrent,
        previous: sellerPrevious,
        deltaPct: {
          revenue: pctChange(sellerCurrent.revenue, sellerPrevious.revenue),
          orders: pctChange(sellerCurrent.orders, sellerPrevious.orders),
          units: pctChange(sellerCurrent.units, sellerPrevious.units),
          profit: pctChange(sellerCurrent.profit, sellerPrevious.profit),
        },
      },
      productPerformance,
      criticalStock,
      profitByProduct,
    },
    content: {
      summary: {
        published: publishedItems.length,
        inProduction: inProductionItems.length,
        ideas: activeIdeas.length,
        engagement,
      },
      trend: {
        periodDays: PERIOD_DAYS,
        current: contentCurrent,
        previous: contentPrevious,
        deltaPct: {
          published: pctChange(contentCurrent.published, contentPrevious.published),
          views: pctChange(contentCurrent.views, contentPrevious.views),
          engagement: pctChange(contentCurrent.engagement, contentPrevious.engagement),
        },
      },
      platformPerformance,
      recentContent,
      topContent,
      pipeline,
      youtubeResearch,
    },
    dataQuality: {
      financeTransactions: transactions.length,
      orders: orders.length,
      products: products.length,
      contentItems: contentItems.length,
      historicalBaseline:
        financePrevious.income > 0 ||
        financePrevious.expense > 0 ||
        sellerPrevious.orders > 0 ||
        contentPrevious.published > 0,
    },
    memory: {
      recentNotifications: recentNotifications.map((notification) => ({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        time: notification.time.toISOString(),
        read: notification.read,
      })),
      lastBriefing: lastBriefing
        ? {
            title: lastBriefing.title,
            period: lastBriefing.period,
            date: lastBriefing.date.toISOString().slice(0, 10),
            sentiment: lastBriefing.sentiment,
            highlights: lastBriefing.highlights,
          }
        : null,
    },
  }
}
