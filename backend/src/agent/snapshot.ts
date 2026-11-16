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

  // --- 1. FINANCE ---
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)
  const net = income - expense
  const savingsRate = income > 0 ? Math.round(((net / income) * 100) * 10) / 10 : 0

  const spentByCategory = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') {
      spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) + t.amount)
    }
  }

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

  // --- 2. SELLER ---
  const validOrders = orders.filter(
    (o) => !['Cancelled', 'Returned'].includes(o.status),
  )
  const grossRevenue = validOrders.reduce((acc, o) => acc + o.total, 0)
  const inventoryValue = products.reduce((acc, p) => acc + p.stock * p.cost, 0)

  // Hitung profit per produk dari order valid
  const profitMap = new Map<string, { sku: string; name: string; profit: number }>()
  const costMap = new Map(products.map((p) => [p.name, p.cost]))
  const skuMap = new Map(products.map((p) => [p.name, p.sku]))

  for (const o of validOrders) {
    const fallbackCost = costMap.get(o.productName) ?? 0
    const cost = o.unitCost > 0 ? o.unitCost : fallbackCost
    const profit = o.total - cost * o.qty
    const sku = skuMap.get(o.productName) ?? 'SKU-UNKNOWN'
    const current = profitMap.get(o.productName) ?? {
      sku,
      name: o.productName,
      profit: 0,
    }
    current.profit += profit
    profitMap.set(o.productName, current)
  }

  const netProfit = Array.from(profitMap.values()).reduce(
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

  const profitByProduct = Array.from(profitMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)

  // --- 3. CONTENT ---
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

  const measuredItems = publishedItems.filter((item) => item.views > 0)
  const engagement =
    measuredItems.length > 0
      ? Math.round(
          (measuredItems.reduce((acc, item) => acc + item.engagement, 0) /
            measuredItems.length) *
            10,
        ) / 10
      : 0

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
      topContent,
      pipeline,
      youtubeResearch,
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
