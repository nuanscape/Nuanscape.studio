import { AppError, badRequest } from '../lib/errors.js'

const API_BASE = 'https://www.googleapis.com/youtube/v3'
const DAY_MS = 86_400_000
const REQUEST_TIMEOUT_MS = 15_000
const DEFAULT_DAYS = 90
const DEFAULT_MAX_RESULTS = 25
const DEFAULT_CACHE_MS = 3_600_000
const MAX_VIDEOS = 50
const MAX_QUERIES = 3
const MAX_BASELINE_CHANNELS = 20
const BASELINE_SAMPLE_SIZE = 10
const MIN_BASELINE_SAMPLE = 3
const MIN_BASELINE_MEDIAN_VIEWS = 50
const MIN_BREAKOUT_VIEWS = 1_000
const MAX_TOP_VIDEOS_PER_CHANNEL = 2

export interface YouTubeResearchVideo {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  ageDays: number
  durationSeconds: number
  views: number
  likes: number
  comments: number
  engagementRate: number
  viewsPerDay: number
  viewsPerHour: number
  outlierRatio: number
  outlierBasis: 'channel' | 'sample'
  channelMedianViews: number | null
  baselineSampleSize: number
  subscriberCount: number
  smallChannel: boolean
  breakout: boolean
  tags: string[]
  url: string
  thumbnail: string
}

export interface YouTubeResearchPatterns {
  sampleSize: number
  queryCount: number
  channelBaselineCount: number
  breakoutCount: number
  medianViews: number
  medianViewsPerDay: number
  shortsShare: number
  topKeywords: Array<{ term: string; count: number }>
  topTags: Array<{ tag: string; count: number }>
  durationBuckets: Array<{ label: string; count: number; medianViews: number }>
  topChannels: Array<{
    channelId: string
    channelTitle: string
    videos: number
    totalViews: number
    breakoutCount: number
    subscriberCount: number
  }>
}

export interface YouTubeResearchResult {
  configured: boolean
  query: string | null
  queries: string[]
  reason?: string
  error?: string
  regionCode: string
  language: string
  windowDays: number
  sampledAt: string
  videos: YouTubeResearchVideo[]
  patterns: YouTubeResearchPatterns
}

export interface ResearchYouTubeOptions {
  query: string
  queries?: string[]
  apiKey?: string
  accessToken?: string
  days?: number
  maxResults?: number
  refresh?: boolean
  cacheTtlMs?: number
}

interface SearchListResponse {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      channelId?: string
      channelTitle?: string
      publishedAt?: string
    }
  }>
}

interface VideoListResponse {
  items?: Array<{
    id: string
    snippet?: {
      title?: string
      channelId?: string
      channelTitle?: string
      publishedAt?: string
      tags?: string[]
    }
    statistics?: {
      viewCount?: string
      likeCount?: string
      commentCount?: string
    }
    contentDetails?: { duration?: string }
  }>
}

interface ChannelListResponse {
  items?: Array<{
    id: string
    snippet?: { title?: string }
    statistics?: { subscriberCount?: string }
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>
}

interface PlaylistItemsResponse {
  items?: Array<{
    contentDetails?: { videoId?: string }
  }>
}

const STOPWORDS = new Set([
  'yang',
  'dan',
  'di',
  'ke',
  'dari',
  'untuk',
  'dengan',
  'ini',
  'itu',
  'ada',
  'atau',
  'juga',
  'akan',
  'pada',
  'dalam',
  'tidak',
  'bisa',
  'sudah',
  'lebih',
  'jadi',
  'saat',
  'cara',
  'agar',
  'bikin',
  'buat',
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'your',
  'you',
  'how',
  'what',
  'why',
  'best',
  'new',
  'video',
  'youtube',
  'shorts',
])

const GENERIC_RESEARCH_SEEDS = new Set([
  'general',
  'umum',
  'music',
  'musik',
  'content',
  'konten',
  'lainnya',
  'other',
  'video',
  'youtube',
])

const QUERY_STOPWORDS = new Set([
  ...STOPWORDS,
  'a',
  'an',
  'of',
  'to',
  'in',
  'on',
  'my',
  'our',
  'official',
  'audio',
  'lyrics',
  'full',
  'mix',
  'playlist',
  'song',
  'songs',
  'lagu',
  'album',
  'hour',
  'hours',
  'jam',
  'minute',
  'minutes',
  'menit',
  'baru',
  'terbaru',
  'top',
  'trending',
])

function titleTokens(title: string): string[] {
  const tokens = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 3 &&
        !/^\d+$/.test(token) &&
        !QUERY_STOPWORDS.has(token),
    )

  const seen = new Set<string>()
  const unique: string[] = []
  for (const token of tokens) {
    if (seen.has(token)) continue
    seen.add(token)
    unique.push(token)
  }
  return unique
}

function deriveTitleQueries(titles: string[]): string[] {
  const counts = new Map<string, { count: number; firstSeen: number }>()
  let position = 0
  for (const title of titles) {
    for (const token of titleTokens(title)) {
      const current = counts.get(token) ?? { count: 0, firstSeen: position }
      current.count += 1
      counts.set(token, current)
      position += 1
    }
  }

  const ranked = [...counts.entries()]
    .sort(
      (a, b) =>
        b[1].count - a[1].count ||
        a[1].firstSeen - b[1].firstSeen ||
        a[0].localeCompare(b[0]),
    )
    .map(([term]) => term)

  const firstTitle = titles[0] ? titleTokens(titles[0]).slice(0, 4).join(' ') : ''
  const candidates = [
    ranked.slice(0, 3).join(' '),
    ranked.slice(0, 2).join(' '),
    firstTitle,
  ]
  return [...new Set(candidates.map((value) => value.trim()).filter(Boolean))]
}

/**
 * Menyusun maksimal tiga query riset dari niche akun dan judul konten terbaru.
 * Niche generik seperti "Music" tidak dipakai sendirian karena hasilnya terlalu
 * luas; judul konten dipakai untuk menurunkan frasa niche yang lebih spesifik.
 */
export function buildResearchQueries(
  seeds: string[],
  titles: string[] = [],
  limit = MAX_QUERIES,
): string[] {
  const normalizedSeeds = [...new Set(seeds.map((seed) => seed.trim()).filter((seed) => seed.length >= 2))]
  const specificSeeds = normalizedSeeds.filter(
    (seed) => !GENERIC_RESEARCH_SEEDS.has(seed.toLowerCase()),
  )
  const derived = deriveTitleQueries(titles.filter((title) => title.trim().length > 0))
  const ordered = [...specificSeeds, ...derived, ...normalizedSeeds]

  const unique: string[] = []
  for (const query of ordered) {
    const trimmed = query.trim().slice(0, 120)
    if (trimmed.length < 2) continue
    if (unique.some((item) => item.toLowerCase() === trimmed.toLowerCase())) continue
    unique.push(trimmed)
    if (unique.length >= limit) break
  }
  return unique
}

const cache = new Map<string, { expiresAt: number; value: YouTubeResearchResult }>()
const inflight = new Map<string, Promise<YouTubeResearchResult>>()

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function getYouTubeResearchApiKey(): string | undefined {
  const key = process.env.YOUTUBE_API_KEY?.trim()
  return key || undefined
}

export function youtubeResearchRegion(): string {
  return (process.env.YOUTUBE_REGION_CODE?.trim() || 'ID').toUpperCase()
}

export function youtubeResearchLanguage(): string {
  return (process.env.YOUTUBE_RELEVANCE_LANGUAGE?.trim() || 'id').toLowerCase()
}

export function youtubeResearchWindowDays(): number {
  return envInt('YOUTUBE_RESEARCH_DAYS', DEFAULT_DAYS, 1, 365)
}

export function emptyYouTubeResearch(
  query: string | null,
  reason: string,
  error?: string,
): YouTubeResearchResult {
  return {
    configured: false,
    query,
    queries: query ? [query] : [],
    reason,
    ...(error ? { error } : {}),
    regionCode: youtubeResearchRegion(),
    language: youtubeResearchLanguage(),
    windowDays: youtubeResearchWindowDays(),
    sampledAt: new Date().toISOString(),
    videos: [],
    patterns: emptyPatterns(),
  }
}

export function clearYouTubeResearchCache(): void {
  cache.clear()
  inflight.clear()
}

function emptyPatterns(): YouTubeResearchPatterns {
  return {
    sampleSize: 0,
    queryCount: 0,
    channelBaselineCount: 0,
    breakoutCount: 0,
    medianViews: 0,
    medianViewsPerDay: 0,
    shortsShare: 0,
    topKeywords: [],
    topTags: [],
    durationBuckets: [
      { label: 'Shorts (<=60s)', count: 0, medianViews: 0 },
      { label: 'Mid (1-8m)', count: 0, medianViews: 0 },
      { label: 'Long (>8m)', count: 0, medianViews: 0 },
    ],
    topChannels: [],
  }
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  const left = sorted[middle - 1] ?? 0
  const right = sorted[middle] ?? 0
  return (left + right) / 2
}

function parseDuration(value: string | undefined): number {
  if (!value) return 0
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value)
  if (!match) return 0
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return Math.round(hours * 3600 + minutes * 60 + seconds)
}

interface YouTubeRequestAuth {
  apiKey?: string
  accessToken?: string
}

async function youtubeGet<T>(
  path: string,
  params: Record<string, string>,
  auth: YouTubeRequestAuth,
): Promise<T> {
  const query = new URLSearchParams(params)
  if (auth.apiKey) query.set('key', auth.apiKey)
  let response: Response | undefined
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(`${API_BASE}/${path}?${query.toString()}`, {
        ...(auth.accessToken ? { headers: { authorization: `Bearer ${auth.accessToken}` } } : {}),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (response.status >= 500 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        continue
      }
      break
    } catch (error) {
      lastError = error
      response = undefined
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        continue
      }
    }
  }
  if (!response) {
    throw new AppError(
      504,
      'YOUTUBE_API_TIMEOUT',
      'YouTube Data API tidak merespons dalam 15 detik. Coba lagi nanti.',
      lastError instanceof Error ? lastError.message : undefined,
    )
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string }
  }
  if (!response.ok) {
    const message = data.error?.message ?? `HTTP ${response.status}`
    throw badRequest(
      'YOUTUBE_API_ERROR',
      `YouTube Data API menolak riset: ${message}`,
    )
  }
  return data as T
}

function normalizeQuery(query: string): string {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    throw badRequest(
      'YOUTUBE_RESEARCH_QUERY_INVALID',
      'Query riset YouTube minimal 2 karakter.',
    )
  }
  if (trimmed.length > 120) {
    throw badRequest(
      'YOUTUBE_RESEARCH_QUERY_INVALID',
      'Query riset YouTube maksimal 120 karakter.',
    )
  }
  return trimmed
}

function cacheKey(
  queries: string[],
  days: number,
  maxResults: number,
  regionCode: string,
  language: string,
): string {
  return JSON.stringify([
    'v2',
    queries.map((query) => query.toLowerCase()),
    days,
    maxResults,
    regionCode,
    language,
  ])
}

function cacheTtlMs(): number {
  return envInt('YOUTUBE_RESEARCH_CACHE_MS', DEFAULT_CACHE_MS, 0, 86_400_000)
}

async function fetchVideoDetails(
  ids: string[],
  auth: YouTubeRequestAuth,
): Promise<NonNullable<VideoListResponse['items']>> {
  const items: NonNullable<VideoListResponse['items']> = []
  for (let index = 0; index < ids.length; index += MAX_VIDEOS) {
    const chunk = ids.slice(index, index + MAX_VIDEOS)
    const data = await youtubeGet<VideoListResponse>(
      'videos',
      {
        part: 'snippet,statistics,contentDetails',
        id: chunk.join(','),
        maxResults: String(MAX_VIDEOS),
      },
      auth,
    )
    items.push(...(data.items ?? []))
  }
  return items
}

interface ChannelInfo {
  title: string
  subscribers: number
  uploadsPlaylistId?: string
}

async function fetchChannels(
  ids: string[],
  auth: YouTubeRequestAuth,
): Promise<Map<string, ChannelInfo>> {
  const result = new Map<string, ChannelInfo>()
  for (let index = 0; index < ids.length; index += MAX_VIDEOS) {
    const chunk = ids.slice(index, index + MAX_VIDEOS)
    const data = await youtubeGet<ChannelListResponse>(
      'channels',
      {
        part: 'snippet,statistics,contentDetails',
        id: chunk.join(','),
        maxResults: String(MAX_VIDEOS),
      },
      auth,
    )
    for (const channel of data.items ?? []) {
      result.set(channel.id, {
        title: channel.snippet?.title ?? '',
        subscribers: toNumber(channel.statistics?.subscriberCount),
        ...(channel.contentDetails?.relatedPlaylists?.uploads
          ? { uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads }
          : {}),
      })
    }
  }
  return result
}

async function fetchChannelBaselines(
  channels: Map<string, ChannelInfo>,
  auth: YouTubeRequestAuth,
  excludeVideoIds: Set<string>,
  priority: string[] = [],
): Promise<Map<string, { medianViews: number; sampleSize: number }>> {
  const ordered = [
    ...new Set([...priority.filter((id) => channels.has(id)), ...channels.keys()]),
  ]
  const channelIds = ordered.slice(0, MAX_BASELINE_CHANNELS)
  const uploads: Array<{ channelId: string; videoIds: string[] }> = []

  for (const channelId of channelIds) {
    const playlistId = channels.get(channelId)?.uploadsPlaylistId
    if (!playlistId) continue
    try {
      const data = await youtubeGet<PlaylistItemsResponse>(
        'playlistItems',
        {
          part: 'contentDetails',
          playlistId,
          maxResults: String(BASELINE_SAMPLE_SIZE),
        },
        auth,
      )
      const videoIds = (data.items ?? [])
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => typeof id === 'string' && !excludeVideoIds.has(id))
      if (videoIds.length >= MIN_BASELINE_SAMPLE) {
        uploads.push({ channelId, videoIds })
      }
    } catch {
      // Satu channel gagal tidak boleh menggagalkan seluruh riset.
    }
  }

  if (uploads.length === 0) return new Map()

  const allIds = [...new Set(uploads.flatMap((entry) => entry.videoIds))]
  const details = await fetchVideoDetails(allIds, auth)
  const viewsById = new Map(
    details
      .map((detail) => [detail.id, toNumber(detail.statistics?.viewCount)] as const)
      .filter(([, views]) => views > 0),
  )

  const baselines = new Map<string, { medianViews: number; sampleSize: number }>()
  for (const entry of uploads) {
    const views = entry.videoIds
      .map((id) => viewsById.get(id) ?? 0)
      .filter((value) => value > 0)
    if (views.length < MIN_BASELINE_SAMPLE) continue
    baselines.set(entry.channelId, {
      medianViews: Math.round(median(views)),
      sampleSize: views.length,
    })
  }
  return baselines
}

function keywordCounts(titles: string[]): Array<{ term: string; count: number }> {
  const counts = new Map<string, number>()
  const add = (term: string) => {
    if (term.length < 4 || STOPWORDS.has(term)) return
    counts.set(term, (counts.get(term) ?? 0) + 1)
  }

  for (const title of titles) {
    const tokens = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
    for (const token of tokens) add(token)
    for (let index = 0; index < tokens.length - 1; index += 1) {
      const first = tokens[index]
      const second = tokens[index + 1]
      if (!first || !second) continue
      if (STOPWORDS.has(first) || STOPWORDS.has(second)) continue
      if (first.length < 3 || second.length < 3) continue
      add(`${first} ${second}`)
    }
  }

  return [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 8)
}

function tagCounts(videos: YouTubeResearchVideo[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const video of videos) {
    for (const tag of video.tags) {
      const normalized = tag.trim().toLowerCase()
      if (!normalized) continue
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 8)
}

function durationBuckets(videos: YouTubeResearchVideo[]): YouTubeResearchPatterns['durationBuckets'] {
  const definitions = [
    { label: 'Shorts (<=60s)', match: (seconds: number) => seconds > 0 && seconds <= 60 },
    { label: 'Mid (1-8m)', match: (seconds: number) => seconds > 60 && seconds <= 480 },
    { label: 'Long (>8m)', match: (seconds: number) => seconds > 480 },
  ]
  return definitions.map((definition) => {
    const bucket = videos.filter((video) => definition.match(video.durationSeconds))
    return {
      label: definition.label,
      count: bucket.length,
      medianViews: Math.round(median(bucket.map((video) => video.views))),
    }
  })
}

function buildPatterns(videos: YouTubeResearchVideo[], queryCount: number): YouTubeResearchPatterns {
  const total = videos.length
  const views = videos.map((video) => video.views)
  const viewsPerDay = videos.map((video) => video.viewsPerDay)
  const shorts = videos.filter(
    (video) => video.durationSeconds > 0 && video.durationSeconds <= 60,
  )
  const baselineChannels = new Set(
    videos
      .filter((video) => video.outlierBasis === 'channel')
      .map((video) => video.channelId),
  )
  const channelMap = new Map<
    string,
    {
      channelId: string
      channelTitle: string
      videos: number
      totalViews: number
      breakoutCount: number
      subscriberCount: number
    }
  >()
  for (const video of videos) {
    const current = channelMap.get(video.channelId) ?? {
      channelId: video.channelId,
      channelTitle: video.channelTitle,
      videos: 0,
      totalViews: 0,
      breakoutCount: 0,
      subscriberCount: video.subscriberCount,
    }
    current.videos += 1
    current.totalViews += video.views
    current.breakoutCount += video.breakout ? 1 : 0
    current.subscriberCount = Math.max(current.subscriberCount, video.subscriberCount)
    channelMap.set(video.channelId, current)
  }

  return {
    sampleSize: total,
    queryCount,
    channelBaselineCount: baselineChannels.size,
    breakoutCount: videos.filter((video) => video.breakout).length,
    medianViews: Math.round(median(views)),
    medianViewsPerDay: round(median(viewsPerDay), 1),
    shortsShare: total > 0 ? round((shorts.length / total) * 100, 1) : 0,
    topKeywords: keywordCounts(videos.map((video) => video.title)),
    topTags: tagCounts(videos),
    durationBuckets: durationBuckets(videos),
    topChannels: [...channelMap.values()]
      .sort((a, b) => b.totalViews - a.totalViews || b.videos - a.videos)
      .slice(0, 5),
  }
}

async function searchYouTube(
  query: string,
  order: 'relevance' | 'date',
  auth: YouTubeRequestAuth,
  publishedAfter: string,
  maxResults: number,
  regionCode: string,
  language: string,
): Promise<SearchListResponse> {
  return youtubeGet<SearchListResponse>(
    'search',
    {
      part: 'snippet',
      q: query,
      type: 'video',
      order,
      maxResults: String(maxResults),
      publishedAfter,
      regionCode,
      relevanceLanguage: language,
      safeSearch: 'none',
    },
    auth,
  )
}

async function executeResearch(
  queries: string[],
  auth: YouTubeRequestAuth,
  days: number,
  maxResults: number,
  regionCode: string,
  language: string,
): Promise<YouTubeResearchResult> {
  const sampledAt = new Date()
  const publishedAfter = new Date(sampledAt.getTime() - days * DAY_MS).toISOString()
  const primaryQuery = queries[0] ?? ''
  const perQuery = Math.min(25, maxResults)
  const passes: Array<{ query: string; order: 'relevance' | 'date' }> = queries.map(
    (query) => ({ query, order: 'relevance' }),
  )
  if (primaryQuery) passes.push({ query: primaryQuery, order: 'date' })

  const settled = await Promise.allSettled(
    passes.map((pass) =>
      searchYouTube(
        pass.query,
        pass.order,
        auth,
        publishedAfter,
        perQuery,
        regionCode,
        language,
      ),
    ),
  )
  const searchResults: SearchListResponse[] = []
  const searchedQueries = new Set<string>()
  let firstError: unknown
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      searchResults.push(result.value)
      const query = passes[index]?.query
      if (query) searchedQueries.add(query.toLowerCase())
      return
    }
    firstError ??= result.reason
  })
  if (searchResults.length === 0) {
    throw firstError instanceof Error
      ? firstError
      : new AppError(504, 'YOUTUBE_API_TIMEOUT', 'YouTube Data API tidak merespons.')
  }

  const searchById = new Map<
    string,
    NonNullable<SearchListResponse['items']>[number]['snippet']
  >()
  for (const result of searchResults) {
    for (const item of result.items ?? []) {
      const videoId = item.id?.videoId
      if (!videoId || searchById.has(videoId)) continue
      searchById.set(videoId, item.snippet)
    }
  }

  if (searchById.size === 0) {
    return {
      configured: true,
      query: primaryQuery || null,
      queries,
      regionCode,
      language,
      windowDays: days,
      sampledAt: sampledAt.toISOString(),
      videos: [],
      patterns: { ...emptyPatterns(), queryCount: searchedQueries.size },
    }
  }

  const ids = [...searchById.keys()]
  const channelIds = [
    ...new Set(
      [...searchById.values()]
        .map((snippet) => snippet?.channelId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const [details, channels] = await Promise.all([
    fetchVideoDetails(ids, auth),
    fetchChannels(channelIds, auth),
  ])
  const channelScores = new Map<string, number>()
  for (const detail of details) {
    const channelId = detail.snippet?.channelId
    if (!channelId) continue
    channelScores.set(
      channelId,
      (channelScores.get(channelId) ?? 0) + toNumber(detail.statistics?.viewCount),
    )
  }
  const channelPriority = [...channelScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channelId]) => channelId)
  const baselines = await fetchChannelBaselines(
    channels,
    auth,
    new Set(ids),
    channelPriority,
  )

  const videos: YouTubeResearchVideo[] = []
  for (const detail of details) {
    const searchSnippet = searchById.get(detail.id)
    const snippet = detail.snippet ?? {}
    const publishedAt = snippet.publishedAt ?? searchSnippet?.publishedAt
    if (!publishedAt) continue
    const published = new Date(publishedAt)
    if (Number.isNaN(published.getTime())) continue

    const ageHours = Math.max(1, (sampledAt.getTime() - published.getTime()) / 3_600_000)
    const ageDays = ageHours / 24
    const views = toNumber(detail.statistics?.viewCount)
    const likes = toNumber(detail.statistics?.likeCount)
    const comments = toNumber(detail.statistics?.commentCount)
    const channelId = snippet.channelId ?? searchSnippet?.channelId ?? ''
    const channel = channels.get(channelId)
    const subscriberCount = channel?.subscribers ?? 0
    const durationSeconds = parseDuration(detail.contentDetails?.duration)
    const smallChannel = subscriberCount > 0 && subscriberCount < 20_000
    const baseline = baselines.get(channelId)

    videos.push({
      videoId: detail.id,
      title: snippet.title ?? searchSnippet?.title ?? '',
      channelId,
      channelTitle: snippet.channelTitle ?? searchSnippet?.channelTitle ?? channel?.title ?? '',
      publishedAt: published.toISOString(),
      ageDays: round(ageDays, 2),
      durationSeconds,
      views,
      likes,
      comments,
      engagementRate: views > 0 ? round(((likes + comments) / views) * 100, 2) : 0,
      viewsPerDay: round(views / Math.max(ageDays, 1 / 24), 1),
      viewsPerHour: round(views / ageHours, 2),
      outlierRatio: 0,
      outlierBasis: baseline ? 'channel' : 'sample',
      channelMedianViews: baseline?.medianViews ?? null,
      baselineSampleSize: baseline?.sampleSize ?? 0,
      subscriberCount,
      smallChannel,
      breakout: false,
      tags: (snippet.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
      url: `https://www.youtube.com/watch?v=${detail.id}`,
      thumbnail: `https://i.ytimg.com/vi/${detail.id}/mqdefault.jpg`,
    })
  }

  const sampleMedianViews = median(videos.map((video) => video.views))
  for (const video of videos) {
    const baselineViews = video.channelMedianViews
    const reference = baselineViews && baselineViews > 0 ? baselineViews : sampleMedianViews
    video.outlierRatio = reference > 0 ? round(video.views / reference, 2) : 0
    const threshold = video.smallChannel ? 2.5 : 3
    video.breakout =
      video.outlierBasis === 'channel' &&
      video.baselineSampleSize >= MIN_BASELINE_SAMPLE &&
      (video.channelMedianViews ?? 0) >= MIN_BASELINE_MEDIAN_VIEWS &&
      video.views >= MIN_BREAKOUT_VIEWS &&
      video.outlierRatio >= threshold
  }

  videos.sort(
    (a, b) =>
      Number(b.breakout) - Number(a.breakout) ||
      b.viewsPerDay - a.viewsPerDay ||
      b.views - a.views ||
      b.outlierRatio - a.outlierRatio,
  )
  const limit = Math.min(20, maxResults)
  const topVideos: YouTubeResearchVideo[] = []
  const skipped: YouTubeResearchVideo[] = []
  const perChannel = new Map<string, number>()
  for (const video of videos) {
    const count = perChannel.get(video.channelId) ?? 0
    if (count >= MAX_TOP_VIDEOS_PER_CHANNEL) {
      skipped.push(video)
      continue
    }
    perChannel.set(video.channelId, count + 1)
    topVideos.push(video)
    if (topVideos.length >= limit) break
  }
  if (topVideos.length < limit) {
    for (const video of skipped) {
      topVideos.push(video)
      if (topVideos.length >= limit) break
    }
  }

  return {
    configured: true,
    query: primaryQuery || null,
    queries,
    regionCode,
    language,
    windowDays: days,
    sampledAt: sampledAt.toISOString(),
    videos: topVideos,
    patterns: buildPatterns(videos, searchedQueries.size),
  }
}

export async function researchYouTube(
  options: ResearchYouTubeOptions,
): Promise<YouTubeResearchResult> {
  const primaryQuery = normalizeQuery(options.query)
  const queries: string[] = []
  const seenQueries = new Set<string>()
  for (const candidate of [
    primaryQuery,
    ...(options.queries ?? []).map((query) => normalizeQuery(query)),
  ]) {
    const key = candidate.toLowerCase()
    if (seenQueries.has(key)) continue
    seenQueries.add(key)
    queries.push(candidate)
    if (queries.length >= MAX_QUERIES) break
  }
  const accessToken = options.accessToken?.trim()
  const apiKey = options.apiKey?.trim() || getYouTubeResearchApiKey()
  if (!apiKey && !accessToken) {
    throw new AppError(
      503,
      'YOUTUBE_NOT_CONFIGURED',
      'Atur YOUTUBE_API_KEY atau hubungkan channel YouTube untuk riset.',
    )
  }
  const auth: YouTubeRequestAuth = accessToken ? { accessToken } : { apiKey }

  const days = options.days ?? youtubeResearchWindowDays()
  const maxResults = options.maxResults ?? envInt('YOUTUBE_RESEARCH_MAX_RESULTS', DEFAULT_MAX_RESULTS, 1, 50)
  const regionCode = youtubeResearchRegion()
  const language = youtubeResearchLanguage()
  const key = cacheKey(queries, days, maxResults, regionCode, language)
  const ttl = options.cacheTtlMs ?? cacheTtlMs()

  if (!options.refresh && ttl > 0) {
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.value
  }

  const pending = inflight.get(key)
  if (pending) return pending

  const job = executeResearch(queries, auth, days, maxResults, regionCode, language)
    .then((result) => {
      if (ttl > 0) cache.set(key, { expiresAt: Date.now() + ttl, value: result })
      return result
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, job)
  return job
}
