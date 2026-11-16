import { randomUUID } from 'node:crypto'
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { mapAccount } from './content.js'

const API_BASE = 'https://www.googleapis.com/youtube/v3'
const ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports'
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DAY_MS = 86_400_000
const MAX_VIDEOS = 100

export const YOUTUBE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
]

interface YouTubeAuth {
  apiKey?: string
  accessToken?: string
}

interface ChannelResponse {
  items?: {
    id: string
    snippet: { title: string; customUrl?: string }
    statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string }
    contentDetails: { relatedPlaylists?: { uploads?: string } }
  }[]
}

interface PlaylistResponse {
  items?: { contentDetails?: { videoId?: string } }[]
  nextPageToken?: string
}

interface VideosResponse {
  items?: {
    id: string
    snippet: { publishedAt: string }
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
  }[]
}

export function getYouTubeApiKey(): string | undefined {
  const key = process.env.YOUTUBE_API_KEY?.trim()
  return key || undefined
}

export interface YouTubeResearchAuth {
  apiKey?: string
  accessToken?: string
}

/**
 * Riset publik bisa memakai API key, atau access token dari channel yang
 * terhubung lewat OAuth. API key diprioritaskan agar kuota riset tidak
 * bergantung pada token user.
 */
export async function youtubeResearchAuthForOwner(
  ownerId: string,
): Promise<YouTubeResearchAuth> {
  const apiKey = getYouTubeApiKey()
  if (apiKey) return { apiKey }

  const account = await prisma.platformAccount.findFirst({
    where: {
      ownerId,
      platform: 'YouTube',
      oauthRefreshToken: { not: null },
    },
    orderBy: { lastSync: 'desc' },
  })
  if (!account?.oauthRefreshToken) return {}

  try {
    return { accessToken: await refreshGoogleAccessToken(account.oauthRefreshToken) }
  } catch {
    return {}
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

async function apiGet<T>(
  path: string,
  params: Record<string, string>,
  auth: YouTubeAuth,
): Promise<T> {
  const query = new URLSearchParams(params)
  if (auth.apiKey) query.set('key', auth.apiKey)
  const headers: Record<string, string> = {}
  if (auth.accessToken) headers.authorization = `Bearer ${auth.accessToken}`
  const response = await fetch(`${API_BASE}/${path}?${query.toString()}`, { headers })
  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string }
  }
  if (!response.ok) {
    const message = data.error?.message ?? `HTTP ${response.status}`
    throw badRequest('YOUTUBE_API_ERROR', `YouTube API menolak permintaan: ${message}`)
  }
  return data as T
}

function channelLookup(raw: string): { kind: 'id' | 'handle'; value: string } {
  const trimmed = raw.trim()
  const fromUrlId = trimmed.match(/\/channel\/(UC[\w-]{10,})/i)
  if (fromUrlId?.[1]) return { kind: 'id', value: fromUrlId[1] }
  const fromUrlHandle = trimmed.match(/\/@([\w.-]{2,})/)
  if (fromUrlHandle?.[1]) return { kind: 'handle', value: `@${fromUrlHandle[1]}` }
  if (/^UC[\w-]{10,}$/.test(trimmed)) return { kind: 'id', value: trimmed }
  const plain = trimmed.match(/^@?([\w.-]{2,})$/)
  return { kind: 'handle', value: `@${plain?.[1] ?? trimmed}` }
}

async function resolveChannel(raw: string, auth: YouTubeAuth) {
  const lookup = channelLookup(raw)
  const part = 'statistics,contentDetails,snippet'
  let data: ChannelResponse
  if (lookup.kind === 'id') {
    data = await apiGet<ChannelResponse>('channels', { part, id: lookup.value }, auth)
  } else {
    data = await apiGet<ChannelResponse>('channels', { part, forHandle: lookup.value }, auth)
    if (!data.items?.length) {
      data = await apiGet<ChannelResponse>(
        'channels',
        { part, forUsername: lookup.value.replace(/^@/, '') },
        auth,
      )
    }
  }
  const channel = data.items?.[0]
  if (!channel) {
    throw notFound(`Channel YouTube ${raw} tidak ditemukan lewat YouTube Data API v3.`)
  }
  return channel
}

async function listUploads(playlistId: string, auth: YouTubeAuth): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  while (ids.length < MAX_VIDEOS) {
    const params: Record<string, string> = {
      part: 'contentDetails',
      playlistId,
      maxResults: '50',
    }
    if (pageToken) params.pageToken = pageToken
    const page = await apiGet<PlaylistResponse>('playlistItems', params, auth)
    for (const item of page.items ?? []) {
      const videoId = item.contentDetails?.videoId
      if (videoId) ids.push(videoId)
    }
    pageToken = page.nextPageToken
    if (!pageToken) break
  }
  return ids.slice(0, MAX_VIDEOS)
}

async function fetchVideos(ids: string[], auth: YouTubeAuth) {
  const videos: NonNullable<VideosResponse['items']> = []
  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50)
    const data = await apiGet<VideosResponse>(
      'videos',
      { part: 'snippet,statistics', id: chunk.join(',') },
      auth,
    )
    videos.push(...(data.items ?? []))
  }
  return videos
}

interface ChannelStatsFallback {
  followers: number
  engagement: number
}

async function collectChannelStats(
  channel: NonNullable<ChannelResponse['items']>[number],
  auth: YouTubeAuth,
  fallback: ChannelStatsFallback,
) {
  const uploadsPlaylist = channel.contentDetails.relatedPlaylists?.uploads
  const videoIds = uploadsPlaylist ? await listUploads(uploadsPlaylist, auth) : []
  const videos = videoIds.length > 0 ? await fetchVideos(videoIds, auth) : []

  const cutoff = Date.now() - 30 * DAY_MS
  const recent = videos.filter(
    (video) => new Date(video.snippet.publishedAt).getTime() >= cutoff,
  )
  const views30d = recent.reduce(
    (total, video) => total + Number(video.statistics.viewCount ?? 0),
    0,
  )
  const likes = recent.reduce(
    (total, video) => total + Number(video.statistics.likeCount ?? 0),
    0,
  )
  const comments = recent.reduce(
    (total, video) => total + Number(video.statistics.commentCount ?? 0),
    0,
  )
  const followers = Number(channel.statistics.subscriberCount ?? fallback.followers)
  const engagement =
    views30d > 0 ? round1(((likes + comments) / views30d) * 100) : fallback.engagement

  return { followers, views30d, posts30d: recent.length, engagement }
}

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return undefined
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URL?.trim() ||
    'http://localhost:8790/api/v1/content/youtube/oauth/callback'
  return { clientId, clientSecret, redirectUri }
}

export function getFrontendUrl(): string {
  const explicit = process.env.FRONTEND_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const firstCors = process.env.CORS_ORIGINS?.split(',')[0]?.trim()
  return (firstCors || 'http://localhost:5173').replace(/\/$/, '')
}

export function buildGoogleAuthUrl(state: string): string {
  const config = getGoogleOAuthConfig()
  if (!config) {
    throw new AppError(
      503,
      'GOOGLE_OAUTH_NOT_CONFIGURED',
      'GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diatur di backend/.env.',
    )
  }
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: YOUTUBE_OAUTH_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  })
  return `${OAUTH_AUTH_URL}?${query.toString()}`
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  scope?: string
  expires_in?: number
  error?: string
  error_description?: string
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const config = getGoogleOAuthConfig()
  if (!config) {
    throw new AppError(
      503,
      'GOOGLE_OAUTH_NOT_CONFIGURED',
      'GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diatur di backend/.env.',
    )
  }
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...params,
    }).toString(),
  })
  const data = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok || data.error) {
    throw badRequest(
      'GOOGLE_OAUTH_ERROR',
      `Google menolak permintaan token: ${data.error_description ?? data.error ?? `HTTP ${response.status}`}`,
    )
  }
  return data
}

export async function exchangeGoogleCode(code: string): Promise<TokenResponse> {
  const config = getGoogleOAuthConfig()
  if (!config) {
    throw new AppError(
      503,
      'GOOGLE_OAUTH_NOT_CONFIGURED',
      'GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diatur di backend/.env.',
    )
  }
  return requestToken({
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  })
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const data = await requestToken({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  if (!data.access_token) {
    throw badRequest('GOOGLE_OAUTH_ERROR', 'Google tidak mengembalikan access token.')
  }
  return data.access_token
}

async function fetchWatchTime(accessToken: string) {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * DAY_MS)
  const day = (date: Date) => date.toISOString().slice(0, 10)
  const query = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: day(start),
    endDate: day(end),
    metrics: 'averageViewDuration,averageViewPercentage',
  })
  try {
    const response = await fetch(`${ANALYTICS_BASE}?${query.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) return undefined
    const data = (await response.json().catch(() => ({}))) as { rows?: number[][] }
    const row = data.rows?.[0]
    if (!row || typeof row[0] !== 'number' || typeof row[1] !== 'number') return undefined
    return { avgWatchMinutes: round1(row[0] / 60), completionRate: round1(row[1]) }
  } catch {
    return undefined
  }
}

async function authForAccount(
  account: { oauthRefreshToken?: string | null },
  apiKey?: string,
): Promise<YouTubeAuth> {
  if (account.oauthRefreshToken) {
    try {
      return { accessToken: await refreshGoogleAccessToken(account.oauthRefreshToken) }
    } catch {
      // Token kedaluwarsa/dicabut: jatuh ke API key bila tersedia.
    }
  }
  if (apiKey) return { apiKey }
  throw new AppError(
    503,
    'YOUTUBE_NOT_CONFIGURED',
    'Atur YOUTUBE_API_KEY atau hubungkan channel dengan Google untuk sinkronisasi.',
  )
}

export interface ConnectYouTubeOptions {
  format?: 'long' | 'short'
  niche?: string
}

export async function connectYouTubeWithCode(
  ownerId: string,
  code: string,
  options: ConnectYouTubeOptions = {},
) {
  const tokens = await exchangeGoogleCode(code)
  if (!tokens.access_token) {
    throw badRequest('GOOGLE_OAUTH_ERROR', 'Google tidak mengembalikan access token.')
  }

  const auth: YouTubeAuth = { accessToken: tokens.access_token }
  const data = await apiGet<ChannelResponse>(
    'channels',
    { part: 'statistics,contentDetails,snippet', mine: 'true' },
    auth,
  )
  const channel = data.items?.[0]
  if (!channel) {
    throw notFound('Channel YouTube tidak ditemukan pada akun Google yang dihubungkan.')
  }

  const customUrl = channel.snippet.customUrl?.trim()
  const handle =
    customUrl && customUrl.length > 0
      ? customUrl.startsWith('@')
        ? customUrl
        : `@${customUrl}`
      : `@${channel.snippet.title.replace(/\s+/g, '').toLowerCase()}`

  const existing = await prisma.platformAccount.findFirst({
    where: {
      ownerId,
      platform: 'YouTube',
      OR: [{ externalId: channel.id }, { handle }],
    },
  })

  const stats = await collectChannelStats(channel, auth, {
    followers: existing?.followers ?? 0,
    engagement: existing?.engagement ?? 0,
  })
  const watch = await fetchWatchTime(tokens.access_token)

  const dataFields = {
    name: channel.snippet.title,
    handle,
    externalId: channel.id,
    oauthRefreshToken: tokens.refresh_token ?? existing?.oauthRefreshToken ?? null,
    oauthScopes: tokens.scope ?? existing?.oauthScopes ?? YOUTUBE_OAUTH_SCOPES.join(' '),
    followers: stats.followers,
    posts30d: stats.posts30d,
    views30d: stats.views30d,
    engagement: stats.engagement,
    avgWatchMinutes: watch?.avgWatchMinutes ?? existing?.avgWatchMinutes ?? 0,
    completionRate: watch?.completionRate ?? existing?.completionRate ?? 0,
    status: 'Active' as const,
    lastSync: new Date(),
  }

  const account = existing
    ? await prisma.platformAccount.update({ where: { id: existing.id }, data: dataFields })
    : await prisma.platformAccount.create({
        data: {
          id: randomUUID(),
          ownerId,
          platform: 'YouTube',
          format: options.format ?? 'long',
          niche: options.niche?.trim() || 'General',
          ...dataFields,
        },
      })

  return {
    account: mapAccount(account),
    channel: { id: channel.id, title: channel.snippet.title },
    stats,
    created: !existing,
  }
}

export interface YouTubeSyncResult {
  account: ReturnType<typeof mapAccount>
  channel: { id: string; title: string }
  stats: { followers: number; views30d: number; posts30d: number; engagement: number }
}

export async function syncYouTubeAccount(
  ownerId: string,
  id: string,
  apiKey: string | undefined = getYouTubeApiKey(),
): Promise<YouTubeSyncResult> {
  const account = await prisma.platformAccount.findFirst({ where: { id, ownerId } })
  if (!account) throw notFound('Akun konten tidak ditemukan.')
  if (account.platform !== 'YouTube') {
    throw badRequest(
      'UNSUPPORTED_PLATFORM',
      'Sinkronisasi YouTube Data API v3 hanya tersedia untuk akun YouTube.',
    )
  }

  const auth = await authForAccount(account, apiKey)
  const channel = await resolveChannel(account.externalId ?? account.handle, auth)
  const { followers, views30d, posts30d, engagement } = await collectChannelStats(
    channel,
    auth,
    account,
  )
  const watch = auth.accessToken ? await fetchWatchTime(auth.accessToken) : undefined

  const updated = await prisma.platformAccount.update({
    where: { id: account.id },
    data: {
      followers,
      views30d,
      posts30d,
      engagement,
      ...(watch
        ? { avgWatchMinutes: watch.avgWatchMinutes, completionRate: watch.completionRate }
        : {}),
      lastSync: new Date(),
    },
  })

  return {
    account: mapAccount(updated),
    channel: { id: channel.id, title: channel.snippet.title },
    stats: { followers, views30d, posts30d, engagement },
  }
}

export interface CreateYouTubeAccountInput {
  handle: string
  format?: 'long' | 'short'
  niche?: string
}

export async function createYouTubeAccount(
  ownerId: string,
  input: CreateYouTubeAccountInput,
  apiKey: string | undefined = getYouTubeApiKey(),
) {
  if (!apiKey) {
    throw new AppError(
      503,
      'YOUTUBE_NOT_CONFIGURED',
      'YOUTUBE_API_KEY belum diatur. Tambahkan di backend/.env untuk menghubungkan channel YouTube.',
    )
  }

  const channel = await resolveChannel(input.handle, { apiKey })
  const customUrl = channel.snippet.customUrl?.trim()
  const handle =
    customUrl && customUrl.length > 0
      ? customUrl.startsWith('@')
        ? customUrl
        : `@${customUrl}`
      : `@${channel.snippet.title.replace(/\s+/g, '').toLowerCase()}`

  const existing = await prisma.platformAccount.findFirst({
    where: { ownerId, platform: 'YouTube', handle },
  })
  if (existing) {
    throw conflict('ACCOUNT_EXISTS', `Channel ${channel.snippet.title} (${handle}) sudah terhubung.`)
  }

  const stats = await collectChannelStats(channel, { apiKey }, { followers: 0, engagement: 0 })
  const created = await prisma.platformAccount.create({
    data: {
      id: randomUUID(),
      ownerId,
      platform: 'YouTube',
      format: input.format ?? 'long',
      name: channel.snippet.title,
      handle,
      niche: input.niche?.trim() || 'General',
      followers: stats.followers,
      posts30d: stats.posts30d,
      views30d: stats.views30d,
      engagement: stats.engagement,
      avgWatchMinutes: 0,
      completionRate: 0,
      status: 'Active',
      lastSync: new Date(),
    },
  })

  return {
    account: mapAccount(created),
    channel: { id: channel.id, title: channel.snippet.title },
    stats,
  }
}

export async function syncAllYouTubeAccounts(
  ownerId: string,
  apiKey: string | undefined = getYouTubeApiKey(),
) {
  const accounts = await prisma.platformAccount.findMany({
    where: { ownerId, platform: 'YouTube' },
  })

  if (!apiKey && accounts.every((account) => !account.oauthRefreshToken)) {
    throw new AppError(
      503,
      'YOUTUBE_NOT_CONFIGURED',
      'Atur YOUTUBE_API_KEY atau hubungkan channel dengan Google untuk sinkronisasi.',
    )
  }

  const synced: YouTubeSyncResult[] = []
  const failed: { id: string; handle: string; message: string }[] = []

  for (const account of accounts) {
    try {
      synced.push(await syncYouTubeAccount(ownerId, account.id, apiKey))
    } catch (error) {
      failed.push({
        id: account.id,
        handle: account.handle,
        message: error instanceof Error ? error.message : 'Sinkronisasi gagal.',
      })
    }
  }

  return { synced: synced.length, failed, items: synced }
}
