import type {
  ContentIdea,
  ContentItem,
  LibraryAsset,
  PlatformAccount,
  Prisma,
} from '@prisma/client'
import { badRequest, notFound } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { hasYouTubeUploadScope } from '../lib/youtube-scopes.js'

export const CONTENT_STATUSES = [
  'Researching',
  'Idea',
  'Approved',
  'Script Ready',
  'Production',
  'Editing',
  'Review',
  'Draft',
  'Ready to Publish',
  'Published',
  'Failed',
] as const

export type ContentStatusValue = (typeof CONTENT_STATUSES)[number]
export const PLATFORMS = ['YouTube', 'TikTok', 'Instagram'] as const
export type PlatformValue = (typeof PLATFORMS)[number]
export type FormatValue = 'long' | 'short'
export const ASSET_TYPES = ['Video', 'Image', 'Thumbnail', 'Script', 'Caption'] as const
export type AssetTypeValue = (typeof ASSET_TYPES)[number]

const PUBLISHED = 'Published'
const FAILED = 'Failed'
const PRODUCTION_STATUSES = ['Production', 'Editing', 'Review'] as const
const IN_PRODUCTION_STATUSES = ['Production', 'Editing', 'Review', 'Script Ready', 'Draft'] as const
const DAY_MS = 86_400_000

const jakartaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const jakartaMonth = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
})
const jakartaWeekday = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
})
const jakartaDayMonth = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
})
const jakartaHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  hour12: false,
})

function iso(date: Date): string {
  return date.toISOString()
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function dayKey(date: Date): string {
  return jakartaDay.format(date)
}

function monthKey(date: Date): string {
  return jakartaMonth.format(date)
}

function hourOf(date: Date): number {
  return Number.parseInt(jakartaHour.format(date), 10)
}

function platformsForFormat(format: FormatValue): PlatformValue[] {
  return format === 'long' ? ['YouTube'] : ['TikTok', 'Instagram']
}

function inFormat(platform: string, format: FormatValue): boolean {
  return platformsForFormat(format).includes(platform as PlatformValue)
}

function average(total: number, count: number): number {
  return count > 0 ? round1(total / count) : 0
}

function classifyCount<T>(rows: T[], pick: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const status of CONTENT_STATUSES) counts[status] = 0
  for (const row of rows) {
    const key = pick(row)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function mapItem(row: ContentItem) {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    ...(row.accountId ? { accountId: row.accountId } : {}),
    niche: row.niche,
    format: row.format,
    status: row.status,
    scheduledAt: iso(row.scheduledAt),
    views: row.views,
    engagement: row.engagement,
    ...(row.script ? { script: row.script } : {}),
    ...(row.thumbnail ? { thumbnail: row.thumbnail } : {}),
    ...(row.caption ? { caption: row.caption } : {}),
    ...(row.hashtags.length > 0 ? { hashtags: row.hashtags } : {}),
    ...(row.previewUrl ? { previewUrl: row.previewUrl } : {}),
    ...(row.videoUrl ? { videoUrl: row.videoUrl } : {}),
    ...(row.youtubeVideoId ? { youtubeVideoId: row.youtubeVideoId } : {}),
    ...(row.youtubeUrl ? { youtubeUrl: row.youtubeUrl } : {}),
    ...(row.youtubePrivacy ? { youtubePrivacy: row.youtubePrivacy } : {}),
    ...(row.youtubeUploadedAt ? { youtubeUploadedAt: iso(row.youtubeUploadedAt) } : {}),
    ...(row.publishStatus ? { publishStatus: row.publishStatus } : {}),
    ...(row.publishError ? { publishError: row.publishError } : {}),
    ...(row.thumbnailStyle ? { thumbnailStyle: row.thumbnailStyle } : {}),
    ...(row.animationStyle ? { animationStyle: row.animationStyle } : {}),
    ...(row.musicStyle ? { musicStyle: row.musicStyle } : {}),
    generated: row.generated,
    ...(row.sourceIdeaId ? { sourceIdeaId: row.sourceIdeaId } : {}),
    createdAt: iso(row.createdAt),
  }
}

export function mapIdea(row: ContentIdea) {
  return {
    id: row.id,
    title: row.title,
    hook: row.hook,
    platform: row.platform,
    ...(row.accountId ? { accountId: row.accountId } : {}),
    niche: row.niche,
    angle: row.angle,
    format: row.format,
    score: row.score,
    ...(row.thumbnail ? { thumbnail: row.thumbnail } : {}),
    ...(row.reference ? { reference: row.reference } : {}),
    status: row.status,
    ...(row.approved ? { approved: true } : {}),
  }
}

export function mapAsset(row: LibraryAsset) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    platform: row.platform,
    ...(row.accountId ? { accountId: row.accountId } : {}),
    size: row.size,
    createdAt: iso(row.createdAt),
    ...(row.contentId ? { contentId: row.contentId } : {}),
  }
}

export function mapAccount(row: PlatformAccount) {
  return {
    id: row.id,
    platform: row.platform,
    format: row.format,
    name: row.name,
    handle: row.handle,
    niche: row.niche,
    followers: row.followers,
    posts30d: row.posts30d,
    views30d: row.views30d,
    engagement: row.engagement,
    avgWatchMinutes: row.avgWatchMinutes,
    completionRate: row.completionRate,
    status: row.status,
    lastSync: iso(row.lastSync),
    ...(row.platform === 'YouTube' ? { uploadReady: hasYouTubeUploadScope(row.oauthScopes) } : {}),
  }
}

export interface ItemFilters {
  format?: FormatValue
  accountId?: string
  status?: ContentStatusValue
  platform?: PlatformValue
  from?: Date
  to?: Date
  q?: string
  hasScript?: boolean
}

export interface IdeaFilters {
  format?: FormatValue
  accountId?: string
  platform?: PlatformValue
  approved?: boolean
  q?: string
}

export interface AssetFilters {
  format?: FormatValue
  accountId?: string
  type?: AssetTypeValue
  contentId?: string
  q?: string
}

export interface CreateItemInput {
  title: string
  platform: PlatformValue
  accountId?: string
  niche: string
  format: string
  status?: ContentStatusValue
  scheduledAt: Date
  caption?: string
  hashtags?: string[]
  script?: string
  thumbnail?: string
  previewUrl?: string
  videoUrl?: string
  thumbnailStyle?: string
  animationStyle?: string
  musicStyle?: string
  generated?: boolean
  sourceIdeaId?: string
}

export interface UpdateItemInput {
  title?: string
  platform?: PlatformValue
  accountId?: string | null
  niche?: string
  format?: string
  status?: ContentStatusValue
  scheduledAt?: Date
  caption?: string | null
  hashtags?: string[]
  script?: string | null
  thumbnail?: string | null
  previewUrl?: string | null
  videoUrl?: string | null
  thumbnailStyle?: string | null
  animationStyle?: string | null
  musicStyle?: string | null
  generated?: boolean
  sourceIdeaId?: string | null
}

export interface CreateIdeaInput {
  title: string
  hook: string
  platform: PlatformValue
  accountId?: string
  niche: string
  angle: string
  format: string
  score: number
  thumbnail?: string
  reference?: string
  status?: string
}

export interface PromoteIdeaInput {
  platform?: PlatformValue
  accountId?: string
}

export interface UpdateIdeaInput {
  approved?: boolean
  status?: string
}

export interface GenerateDraftInput {
  ideaId?: string
  title?: string
  platform: PlatformValue
  accountId?: string
  niche?: string
  format?: FormatValue
  thumbnailStyle?: string
  animationStyle?: string
  musicStyle?: string
  scheduledAt?: Date
}

export interface CreateAssetInput {
  name: string
  type: AssetTypeValue
  platform: PlatformValue
  accountId?: string
  size: string
  createdAt?: Date
  contentId?: string
}

async function getOwnedAccount(ownerId: string, accountId: string): Promise<PlatformAccount> {
  const account = await prisma.platformAccount.findFirst({ where: { id: accountId, ownerId } })
  if (!account) throw badRequest('INVALID_ACCOUNT', 'Akun konten tidak ditemukan.')
  return account
}

export async function assertAccountPlatform(
  ownerId: string,
  accountId: string,
  platform: PlatformValue,
): Promise<PlatformAccount> {
  const account = await getOwnedAccount(ownerId, accountId)
  if (account.platform !== platform) {
    throw badRequest(
      'ACCOUNT_PLATFORM_MISMATCH',
      `Akun ${account.handle} tidak terdaftar pada platform ${platform}.`,
    )
  }
  return account
}

function buildItemWhere(ownerId: string, filters: ItemFilters): Prisma.ContentItemWhereInput {
  const and: Prisma.ContentItemWhereInput[] = []

  if (filters.format) and.push({ platform: { in: platformsForFormat(filters.format) } })
  if (filters.platform) and.push({ platform: filters.platform })
  if (filters.accountId) and.push({ accountId: filters.accountId })
  if (filters.status) and.push({ status: filters.status })
  if (filters.from || filters.to) {
    and.push({
      scheduledAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    })
  }
  if (filters.hasScript) {
    and.push({ script: { not: null } }, { script: { not: '' } })
  }
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { niche: { contains: filters.q, mode: 'insensitive' } },
      ],
    })
  }

  return { ownerId, ...(and.length > 0 ? { AND: and } : {}) }
}

export async function listItems(ownerId: string, filters: ItemFilters = {}) {
  const items = await prisma.contentItem.findMany({
    where: buildItemWhere(ownerId, filters),
    orderBy: [{ createdAt: 'desc' }],
  })
  return { items: items.map(mapItem) }
}

export async function getItem(ownerId: string, id: string) {
  const item = await prisma.contentItem.findFirst({ where: { id, ownerId } })
  if (!item) throw notFound('Konten tidak ditemukan.')
  return { item: mapItem(item) }
}

export async function createItem(ownerId: string, input: CreateItemInput) {
  if (input.accountId) await assertAccountPlatform(ownerId, input.accountId, input.platform)

  const item = await prisma.contentItem.create({
    data: {
      ownerId,
      title: input.title,
      platform: input.platform,
      accountId: input.accountId ?? null,
      niche: input.niche,
      format: input.format,
      status: input.status ?? 'Draft',
      scheduledAt: input.scheduledAt,
      caption: input.caption ?? null,
      hashtags: input.hashtags ?? [],
      script: input.script ?? null,
      thumbnail: input.thumbnail ?? null,
      previewUrl: input.previewUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      thumbnailStyle: input.thumbnailStyle ?? null,
      animationStyle: input.animationStyle ?? null,
      musicStyle: input.musicStyle ?? null,
      generated: input.generated ?? false,
      sourceIdeaId: input.sourceIdeaId ?? null,
    },
  })

  return { item: mapItem(item) }
}

export async function updateItem(ownerId: string, id: string, input: UpdateItemInput) {
  const existing = await prisma.contentItem.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Konten tidak ditemukan.')

  const platform = input.platform ?? existing.platform
  const accountId = input.accountId !== undefined ? input.accountId : existing.accountId
  if (accountId) await assertAccountPlatform(ownerId, accountId, platform)

  const data: Prisma.ContentItemUncheckedUpdateInput = {}
  if (input.title !== undefined) data.title = input.title
  if (input.platform !== undefined) data.platform = input.platform
  if (input.accountId !== undefined) data.accountId = input.accountId
  if (input.niche !== undefined) data.niche = input.niche
  if (input.format !== undefined) data.format = input.format
  if (input.status !== undefined) data.status = input.status
  if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt
  if (input.caption !== undefined) data.caption = input.caption
  if (input.hashtags !== undefined) data.hashtags = input.hashtags
  if (input.script !== undefined) data.script = input.script
  if (input.thumbnail !== undefined) data.thumbnail = input.thumbnail
  if (input.previewUrl !== undefined) data.previewUrl = input.previewUrl
  if (input.videoUrl !== undefined) data.videoUrl = input.videoUrl
  if (input.thumbnailStyle !== undefined) data.thumbnailStyle = input.thumbnailStyle
  if (input.animationStyle !== undefined) data.animationStyle = input.animationStyle
  if (input.musicStyle !== undefined) data.musicStyle = input.musicStyle
  if (input.generated !== undefined) data.generated = input.generated
  if (input.sourceIdeaId !== undefined) data.sourceIdeaId = input.sourceIdeaId

  const item = await prisma.contentItem.update({ where: { id: existing.id }, data })
  return { item: mapItem(item) }
}

export async function deleteItem(ownerId: string, id: string) {
  const result = await prisma.contentItem.deleteMany({ where: { id, ownerId } })
  if (result.count === 0) throw notFound('Konten tidak ditemukan.')
  return { deleted: true, id }
}

export async function listIdeas(ownerId: string, filters: IdeaFilters = {}) {
  const and: Prisma.ContentIdeaWhereInput[] = []
  if (filters.format) and.push({ platform: { in: platformsForFormat(filters.format) } })
  if (filters.platform) and.push({ platform: filters.platform })
  if (filters.accountId) and.push({ accountId: filters.accountId })
  if (filters.approved !== undefined) and.push({ approved: filters.approved })
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { niche: { contains: filters.q, mode: 'insensitive' } },
        { hook: { contains: filters.q, mode: 'insensitive' } },
      ],
    })
  }

  const ideas = await prisma.contentIdea.findMany({
    where: { ownerId, ...(and.length > 0 ? { AND: and } : {}) },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  })

  return { ideas: ideas.map(mapIdea) }
}

export async function createIdea(ownerId: string, input: CreateIdeaInput) {
  if (input.accountId) await assertAccountPlatform(ownerId, input.accountId, input.platform)

  const idea = await prisma.contentIdea.create({
    data: {
      ownerId,
      title: input.title,
      hook: input.hook,
      platform: input.platform,
      accountId: input.accountId ?? null,
      niche: input.niche,
      angle: input.angle,
      format: input.format,
      score: input.score,
      ...(input.thumbnail ? { thumbnail: input.thumbnail } : {}),
      ...(input.reference ? { reference: input.reference } : {}),
      status: input.status ?? 'draft',
    },
  })

  return { idea: mapIdea(idea) }
}

export async function updateIdea(ownerId: string, id: string, input: UpdateIdeaInput) {
  const existing = await prisma.contentIdea.findFirst({ where: { id, ownerId } })
  if (!existing) throw notFound('Ide tidak ditemukan.')

  const data: Prisma.ContentIdeaUpdateInput = {}
  if (input.approved !== undefined) data.approved = input.approved
  if (input.status !== undefined) data.status = input.status

  const idea = await prisma.contentIdea.update({
    where: { id: existing.id },
    data,
  })

  return { idea: mapIdea(idea) }
}

export async function promoteIdea(ownerId: string, id: string, input: PromoteIdeaInput) {
  const idea = await prisma.contentIdea.findFirst({ where: { id, ownerId } })
  if (!idea) throw notFound('Ide tidak ditemukan.')

  const platform = input.platform ?? idea.platform
  const accountId = input.accountId !== undefined ? input.accountId : idea.accountId
  if (accountId) await assertAccountPlatform(ownerId, accountId, platform)

  const [item, updatedIdea] = await prisma.$transaction([
    prisma.contentItem.create({
      data: {
        ownerId,
        title: idea.title,
        platform,
        accountId: accountId ?? null,
        niche: idea.niche,
        format: idea.format,
        status: 'Approved',
        scheduledAt: new Date(Date.now() + 3 * DAY_MS),
        views: 0,
        engagement: 0,
      },
    }),
    prisma.contentIdea.update({ where: { id: idea.id }, data: { approved: true } }),
  ])

  return { item: mapItem(item), idea: mapIdea(updatedIdea) }
}

export async function listAssets(ownerId: string, filters: AssetFilters = {}) {
  const and: Prisma.LibraryAssetWhereInput[] = []
  if (filters.format) and.push({ platform: { in: platformsForFormat(filters.format) } })
  if (filters.accountId) and.push({ accountId: filters.accountId })
  if (filters.type) and.push({ type: filters.type })
  if (filters.contentId) and.push({ contentId: filters.contentId })
  if (filters.q) and.push({ name: { contains: filters.q, mode: 'insensitive' } })

  const assets = await prisma.libraryAsset.findMany({
    where: { ownerId, ...(and.length > 0 ? { AND: and } : {}) },
    orderBy: [{ createdAt: 'desc' }],
  })

  return { assets: assets.map(mapAsset) }
}

export async function createAsset(ownerId: string, input: CreateAssetInput) {
  if (input.accountId) await assertAccountPlatform(ownerId, input.accountId, input.platform)

  if (input.contentId) {
    const content = await prisma.contentItem.findFirst({
      where: { id: input.contentId, ownerId },
      select: { id: true },
    })
    if (!content) throw badRequest('INVALID_CONTENT', 'Konten tidak ditemukan.')
  }

  const asset = await prisma.libraryAsset.create({
    data: {
      ownerId,
      name: input.name,
      type: input.type,
      platform: input.platform,
      accountId: input.accountId ?? null,
      size: input.size,
      createdAt: input.createdAt ?? new Date(),
      contentId: input.contentId ?? null,
    },
  })

  return { asset: mapAsset(asset) }
}

export async function listAccounts(ownerId: string, format?: FormatValue) {
  const accounts = await prisma.platformAccount.findMany({
    where: { ownerId, ...(format ? { format } : {}) },
    orderBy: [{ format: 'asc' }, { platform: 'asc' }, { followers: 'desc' }],
  })
  return { accounts: accounts.map(mapAccount) }
}

export async function getAccountDetail(ownerId: string, id: string) {
  const account = await prisma.platformAccount.findFirst({ where: { id, ownerId } })
  if (!account) throw notFound('Akun konten tidak ditemukan.')

  const [items, ideas] = await Promise.all([
    prisma.contentItem.findMany({
      where: { ownerId, accountId: account.id },
      orderBy: [{ scheduledAt: 'asc' }],
    }),
    prisma.contentIdea.findMany({
      where: { ownerId, accountId: account.id },
      orderBy: [{ score: 'desc' }],
    }),
  ])

  const published = items.filter((item) => item.status === PUBLISHED)
  const statusCounts = classifyCount(items, (item) => item.status)
  const now = Date.now()

  return {
    account: mapAccount(account),
    stats: {
      items: items.length,
      published: published.length,
      views: published.reduce((total, item) => total + item.views, 0),
      engagement: average(
        published.reduce((total, item) => total + item.engagement, 0),
        published.length,
      ),
      ideas: ideas.length,
      statusCounts,
    },
    items: items.map(mapItem),
    ideas: ideas.map(mapIdea),
    upcoming: items
      .filter(
        (item) =>
          item.status !== PUBLISHED &&
          item.status !== FAILED &&
          item.scheduledAt.getTime() >= now,
      )
      .slice(0, 5)
      .map(mapItem),
  }
}

export async function getOverview(ownerId: string) {
  const [items, ideas, assets, accounts] = await Promise.all([
    prisma.contentItem.findMany({ where: { ownerId }, orderBy: [{ scheduledAt: 'asc' }] }),
    prisma.contentIdea.findMany({ where: { ownerId }, orderBy: [{ score: 'desc' }] }),
    prisma.libraryAsset.findMany({ where: { ownerId }, orderBy: [{ createdAt: 'desc' }] }),
    prisma.platformAccount.findMany({ where: { ownerId }, orderBy: [{ followers: 'desc' }] }),
  ])

  const now = Date.now()

  const buildFormat = (format: FormatValue) => {
    const formatItems = items.filter((item) => inFormat(item.platform, format))
    const formatIdeas = ideas.filter((idea) => inFormat(idea.platform, format))
    const formatAssets = assets.filter((asset) => inFormat(asset.platform, format))
    const formatAccounts = accounts.filter((account) => account.format === format)
    const published = formatItems.filter((item) => item.status === PUBLISHED)
    const statusCounts = classifyCount(formatItems, (item) => item.status)

    const accountBriefs = formatAccounts.map((account) => {
      const accountItems = formatItems.filter((item) => item.accountId === account.id)
      return {
        ...mapAccount(account),
        items: accountItems.length,
        published: accountItems.filter((item) => item.status === PUBLISHED).length,
      }
    })

    return {
      format,
      summary: {
        items: formatItems.length,
        published: published.length,
        views: published.reduce((total, item) => total + item.views, 0),
        engagement: average(
          published.reduce((total, item) => total + item.engagement, 0),
          published.length,
        ),
        inProduction: formatItems.filter((item) =>
          (IN_PRODUCTION_STATUSES as readonly string[]).includes(item.status),
        ).length,
        ideas: formatIdeas.length,
        unapprovedIdeas: formatIdeas.filter((idea) => !idea.approved).length,
        scripts: formatItems.filter((item) => Boolean(item.script)).length,
        scheduled: formatItems.filter(
          (item) =>
            item.status !== PUBLISHED &&
            item.status !== FAILED &&
            item.scheduledAt.getTime() >= now,
        ).length,
      },
      statusCounts,
      stageCounts: {
        research: statusCounts.Researching ?? 0,
        ideas: formatIdeas.filter((idea) => !idea.approved).length,
        scripts: formatItems.filter((item) => Boolean(item.script)).length,
        studio: formatItems.filter((item) =>
          (PRODUCTION_STATUSES as readonly string[]).includes(item.status),
        ).length,
        drafts: formatItems.filter((item) => item.status !== PUBLISHED).length,
        calendar: formatItems.filter(
          (item) =>
            item.status !== PUBLISHED &&
            item.status !== FAILED &&
            item.scheduledAt.getTime() >= now,
        ).length,
        library: formatAssets.length,
        analytics: published.length,
      },
      accounts: accountBriefs,
      upcoming: formatItems
        .filter(
          (item) =>
            item.status !== PUBLISHED &&
            item.status !== FAILED &&
            item.scheduledAt.getTime() >= now,
        )
        .slice(0, 5)
        .map(mapItem),
      recentPublished: published
        .slice()
        .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
        .slice(0, 5)
        .map(mapItem),
    }
  }

  const formats = { long: buildFormat('long'), short: buildFormat('short') }
  const published = items.filter((item) => item.status === PUBLISHED)

  return {
    generatedAt: new Date().toISOString(),
    formats,
    totals: {
      items: items.length,
      published: published.length,
      views: published.reduce((total, item) => total + item.views, 0),
      engagement: average(
        published.reduce((total, item) => total + item.engagement, 0),
        published.length,
      ),
      ideas: ideas.length,
      assets: assets.length,
      accounts: accounts.length,
    },
  }
}

export async function getAnalytics(
  ownerId: string,
  format: FormatValue,
  accountId?: string,
  days = 7,
) {
  const windowDays = Math.min(365, Math.max(1, Math.trunc(days)))
  const items = await prisma.contentItem.findMany({
    where: {
      ownerId,
      platform: { in: platformsForFormat(format) },
      ...(accountId ? { accountId } : {}),
    },
    orderBy: [{ scheduledAt: 'asc' }],
  })

  const accounts = await prisma.platformAccount.findMany({ where: { ownerId } })
  const published = items.filter((item) => item.status === PUBLISHED)

  const seriesMap = new Map<string, { views: number; engagementTotal: number; count: number }>()
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    seriesMap.set(dayKey(new Date(Date.now() - offset * DAY_MS)), {
      views: 0,
      engagementTotal: 0,
      count: 0,
    })
  }

  for (const item of published) {
    const key = dayKey(item.scheduledAt)
    const bucket = seriesMap.get(key)
    if (!bucket) continue
    bucket.views += item.views
    bucket.engagementTotal += item.engagement
    bucket.count += 1
  }

  const series = Array.from(seriesMap.entries()).map(([date, bucket]) => ({
    date,
    label:
      windowDays > 14
        ? jakartaDayMonth.format(new Date(`${date}T12:00:00+07:00`))
        : jakartaWeekday.format(new Date(`${date}T12:00:00+07:00`)),
    views: bucket.views,
    engagement: average(bucket.engagementTotal, bucket.count),
  }))

  const contributionMap = new Map<string, number>()
  for (const item of published) {
    const key = item.accountId ?? 'unassigned'
    contributionMap.set(key, (contributionMap.get(key) ?? 0) + item.views)
  }
  const contributionTotal = Array.from(contributionMap.values()).reduce(
    (total, value) => total + value,
    0,
  )
  const contribution = Array.from(contributionMap.entries())
    .map(([key, value]) => {
      const account = accounts.find((entry) => entry.id === key)
      return {
        id: key,
        name: account?.name ?? 'Tanpa akun',
        handle: account?.handle ?? '—',
        value,
        share: contributionTotal > 0 ? round1((value / contributionTotal) * 100) : 0,
      }
    })
    .sort((a, b) => b.value - a.value)

  const bestTimeMap = new Map<number, { engagementTotal: number; count: number }>()
  for (const item of published) {
    const hour = hourOf(item.scheduledAt)
    const bucket = bestTimeMap.get(hour) ?? { engagementTotal: 0, count: 0 }
    bucket.engagementTotal += item.engagement
    bucket.count += 1
    bestTimeMap.set(hour, bucket)
  }
  const bestTime = Array.from(bestTimeMap.entries())
    .map(([hour, bucket]) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      engagement: average(bucket.engagementTotal, bucket.count),
      posts: bucket.count,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 3)

  return {
    format,
    ...(accountId ? { accountId } : {}),
    summary: {
      items: items.length,
      published: published.length,
      views: published.reduce((total, item) => total + item.views, 0),
      engagement: average(
        published.reduce((total, item) => total + item.engagement, 0),
        published.length,
      ),
    },
    series,
    contribution,
    performance: published
      .slice()
      .sort((a, b) => b.views - a.views)
      .slice(0, 20)
      .map(mapItem),
    bestTime,
  }
}

export async function getCalendar(
  ownerId: string,
  format: FormatValue,
  month?: string,
  accountId?: string,
) {
  const items = await prisma.contentItem.findMany({
    where: {
      ownerId,
      platform: { in: platformsForFormat(format) },
      ...(accountId ? { accountId } : {}),
    },
    orderBy: [{ scheduledAt: 'asc' }],
  })

  const targetMonth = month ?? monthKey(new Date())
  const inMonth = items.filter((item) => dayKey(item.scheduledAt).startsWith(targetMonth))
  const daysMap = new Map<string, ContentItem[]>()

  for (const item of inMonth) {
    const key = dayKey(item.scheduledAt)
    const bucket = daysMap.get(key) ?? []
    bucket.push(item)
    daysMap.set(key, bucket)
  }

  const days = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({ date, items: rows.map(mapItem) }))

  return {
    format,
    month: targetMonth,
    ...(accountId ? { accountId } : {}),
    summary: {
      scheduled: inMonth.length,
      ready: inMonth.filter((item) => item.status === 'Ready to Publish').length,
      production: inMonth.filter((item) =>
        (PRODUCTION_STATUSES as readonly string[]).includes(item.status),
      ).length,
      published: inMonth.filter((item) => item.status === PUBLISHED).length,
    },
    days,
  }
}

export async function getEnergy(ownerId: string) {
  const energy = await prisma.contentEnergy.upsert({
    where: { ownerId },
    update: {},
    create: { ownerId, current: 100, max: 100 },
  })
  return {
    current: energy.current,
    max: energy.max,
    remainingGenerations: Math.floor(energy.current / 10),
    lastRechargeAt: iso(energy.lastRechargeAt),
  }
}

export async function consumeEnergy(ownerId: string, amount = 10) {
  const energy = await prisma.contentEnergy.upsert({
    where: { ownerId },
    update: {},
    create: { ownerId, current: 100, max: 100 },
  })
  if (energy.current < amount) {
    throw badRequest(
      'INSUFFICIENT_ENERGY',
      `Energy AI tidak mencukupi (tersedia ${energy.current}, butuh ${amount}). Silakan isi ulang energy.`,
    )
  }
  const updated = await prisma.contentEnergy.update({
    where: { ownerId },
    data: { current: { decrement: amount } },
  })
  return {
    current: updated.current,
    max: updated.max,
    remainingGenerations: Math.floor(updated.current / 10),
    lastRechargeAt: iso(updated.lastRechargeAt),
  }
}

export async function rechargeEnergy(ownerId: string) {
  const energy = await prisma.contentEnergy.upsert({
    where: { ownerId },
    update: { current: 100, max: 100, lastRechargeAt: new Date() },
    create: { ownerId, current: 100, max: 100, lastRechargeAt: new Date() },
  })
  return {
    current: energy.current,
    max: energy.max,
    remainingGenerations: Math.floor(energy.current / 10),
    lastRechargeAt: iso(energy.lastRechargeAt),
  }
}

export async function generateDraft(ownerId: string, input: GenerateDraftInput) {
  const remainingEnergy = await consumeEnergy(ownerId, 10)

  let title = input.title
  let niche = input.niche ?? 'Creative'
  let format = input.format ?? (input.platform === 'YouTube' ? 'long' : 'short')
  let script = 'Draft skrip otomatis yang dihasilkan oleh agen Bambang.'
  let caption = 'Caption otomatis teroptimasi SEO.'
  const hashtags: string[] = ['#Nuanscape', '#ContentCreator']

  if (input.ideaId) {
    const idea = await prisma.contentIdea.findFirst({ where: { id: input.ideaId, ownerId } })
    if (idea) {
      title = title ?? idea.title
      niche = idea.niche
      format = (idea.format as FormatValue) ?? format
      script = `[Hook] ${idea.hook}\n\n[Angle] ${idea.angle}\n\n[Konten Utama]\nPenjelasan terstruktur konten sesuai niche ${idea.niche}.\n\n[Call to Action]\nFollow dan subscribe Nuanscape!`
      caption = `${idea.title} - ${idea.hook}`
      await prisma.contentIdea.update({
        where: { id: idea.id },
        data: { status: 'completed' },
      })
    }
  }

  if (!title) {
    title = `Konten Baru ${input.platform} ${new Date().toISOString().slice(0, 10)}`
  }

  if (input.accountId) {
    await assertAccountPlatform(ownerId, input.accountId, input.platform)
  }

  const scheduledAt = input.scheduledAt ?? new Date(Date.now() + 3 * DAY_MS)

  const created = await prisma.contentItem.create({
    data: {
      ownerId,
      title,
      platform: input.platform,
      accountId: input.accountId,
      niche,
      format,
      status: 'Draft',
      scheduledAt,
      script,
      caption,
      hashtags,
      thumbnailStyle: input.thumbnailStyle,
      animationStyle: input.animationStyle,
      musicStyle: input.musicStyle,
      generated: true,
      sourceIdeaId: input.ideaId,
    },
  })

  return {
    item: mapItem(created),
    energy: remainingEnergy,
  }
}

export async function rejectIdea(ownerId: string, id: string) {
  const idea = await prisma.contentIdea.findFirst({ where: { id, ownerId } })
  if (!idea) throw notFound('Ide konten tidak ditemukan.')
  const updated = await prisma.contentIdea.update({
    where: { id },
    data: { status: 'rejected', approved: false },
  })
  return mapIdea(updated)
}

export async function getContentAgentReport(ownerId: string) {
  const [items, ideas, accounts, energy] = await Promise.all([
    prisma.contentItem.findMany({ where: { ownerId }, orderBy: { scheduledAt: 'asc' } }),
    prisma.contentIdea.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }),
    prisma.platformAccount.findMany({ where: { ownerId }, orderBy: { followers: 'desc' } }),
    getEnergy(ownerId),
  ])

  const statusCounts: Record<string, number> = {}
  for (const status of CONTENT_STATUSES) statusCounts[status] = 0
  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1
  }

  const needsReview = items.filter((item) =>
    ['Review', 'Draft', 'Script Ready'].includes(item.status),
  )
  const upcomingPublications = items
    .filter((item) => item.status === 'Ready to Publish' || item.status === 'Draft')
    .slice(0, 10)

  const ideasApproved = ideas.filter((i) => i.approved).length
  const ideasRejected = ideas.filter((i) => i.status === 'rejected').length
  const ideasDraft = ideas.filter((i) => !i.approved && i.status !== 'rejected').length

  const recommendations = [
    ...(energy.current < 30
      ? [
          {
            id: 'rec-energy',
            title: 'Energy AI rendah',
            detail: `Sisa energy AI ${energy.current}/100. Segera isi ulang untuk melanjutkan generate draft otomatis.`,
            action: 'Isi Ulang Energy',
          },
        ]
      : []),
    ...(needsReview.length > 0
      ? [
          {
            id: 'rec-review',
            title: `${needsReview.length} draft butuh persetujuan`,
            detail: 'Ada skrip dan konten yang siap dinaikkan ke tahap produksi.',
            action: 'Buka Drafts',
          },
        ]
      : []),
    {
      id: 'rec-ideas',
      title: 'Tingkatkan backlog ide TikTok & Instagram',
      detail: 'Jadwal tayang short video minggu depan masih memiliki slot kosong.',
      action: 'Buka Ide Konten',
    },
  ]

  return {
    agent: {
      name: 'Bambang',
      role: 'Content Production Agent',
      status: 'active',
      focus: 'Ideasi, skrip, aset & jadwal tayang',
    },
    energy,
    summary: {
      totalItems: items.length,
      published: items.filter((i) => i.status === PUBLISHED).length,
      inProduction: items.filter((i) =>
        (IN_PRODUCTION_STATUSES as readonly string[]).includes(i.status),
      ).length,
      readyToPublish: items.filter((i) => i.status === 'Ready to Publish').length,
      drafts: items.filter((i) => i.status === 'Draft').length,
    },
    statusCounts,
    needsReview: needsReview.map(mapItem),
    upcomingPublications: upcomingPublications.map(mapItem),
    accounts: accounts.map(mapAccount),
    ideas: {
      total: ideas.length,
      approved: ideasApproved,
      rejected: ideasRejected,
      draft: ideasDraft,
    },
    recommendations,
  }
}
