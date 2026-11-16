import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'
import {
  buildGoogleAuthUrl,
  connectYouTubeWithCode,
  createYouTubeAccount,
  syncAllYouTubeAccounts,
  syncYouTubeAccount,
} from '../src/services/youtube.js'

const suffix = randomUUID().slice(0, 8)
const email = `youtube-test-${suffix}@nuanscape.test`
const app = await buildApp({ config: { ...loadConfig(), swaggerEnabled: false }, logger: false })

let ownerId = ''
let youtubeId = ''
let tiktokId = ''

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function stubYouTubeApi(
  overrides: { emptyChannel?: boolean; title?: string; customUrl?: string; channelId?: string } = {},
) {
  const now = Date.now()
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    const path = url.pathname.split('/').pop()

    if (path === 'channels') {
      if (overrides.emptyChannel) return json({ items: [] })
      return json({
        items: [
          {
            id: overrides.channelId ?? 'UC_test',
            snippet: {
              title: overrides.title ?? 'Muhe Studio',
              customUrl: overrides.customUrl ?? '@muhestudio',
            },
            statistics: { subscriberCount: '128400', viewCount: '9000000', videoCount: '120' },
            contentDetails: { relatedPlaylists: { uploads: 'UU_test' } },
          },
        ],
      })
    }

    if (path === 'playlistItems') {
      return json({ items: [{ contentDetails: { videoId: 'v_recent' } }, { contentDetails: { videoId: 'v_old' } }] })
    }

    if (path === 'videos') {
      return json({
        items: [
          {
            id: 'v_recent',
            snippet: { publishedAt: new Date(now - 5 * 86_400_000).toISOString() },
            statistics: { viewCount: '1000', likeCount: '100', commentCount: '10' },
          },
          {
            id: 'v_old',
            snippet: { publishedAt: new Date(now - 40 * 86_400_000).toISOString() },
            statistics: { viewCount: '5000', likeCount: '300', commentCount: '40' },
          },
        ],
      })
    }

    return json({ error: { message: `unexpected path ${path}` } }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}


function stubGoogleOAuth(options: { refreshToken?: string | null } = {}) {
  const now = Date.now()
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.pathname

    if (path === '/token') {
      const body = String(init?.body ?? '')
      if (!body.includes('grant_type=authorization_code') && !body.includes('grant_type=refresh_token')) {
        return json({ error: 'invalid_grant' }, 400)
      }
      return json({
        access_token: 'oauth-access-token',
        ...(options.refreshToken === null ? {} : { refresh_token: options.refreshToken ?? 'oauth-refresh-token' }),
        scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
        expires_in: 3600,
      })
    }

    if (path.endsWith('/v2/reports')) {
      return json({ rows: [[210, 52]] })
    }

    if (path.endsWith('/youtube/v3/channels')) {
      if (url.searchParams.get('mine') !== 'true') {
        return json({ error: { message: 'mine wajib' } }, 400)
      }
      return json({
        items: [
          {
            id: 'UC_oauth1234567',
            snippet: { title: 'OAuth Studio', customUrl: '@oauthstudio' },
            statistics: { subscriberCount: '5400', viewCount: '120000', videoCount: '30' },
            contentDetails: { relatedPlaylists: { uploads: 'UU_oauth' } },
          },
        ],
      })
    }

    if (path.endsWith('/playlistItems')) {
      return json({ items: [{ contentDetails: { videoId: 'ov1' } }] })
    }

    if (path.endsWith('/videos')) {
      return json({
        items: [
          {
            id: 'ov1',
            snippet: { publishedAt: new Date(now - 2 * 86_400_000).toISOString() },
            statistics: { viewCount: '2400', likeCount: '120', commentCount: '24' },
          },
        ],
      })
    }

    return json({ error: { message: `unexpected ${url}` } }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const oauthEnv = {
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_OAUTH_REDIRECT_URL: 'http://localhost:8790/api/v1/content/youtube/oauth/callback',
  FRONTEND_URL: 'http://localhost:5173',
}

function setOAuthEnv() {
  for (const [key, value] of Object.entries(oauthEnv)) process.env[key] = value
}

function clearOAuthEnv() {
  for (const key of Object.keys(oauthEnv)) delete process.env[key]
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { email, name: 'YouTube Test Owner', passwordHash: 'TEST_NO_LOGIN' },
  })
  ownerId = owner.id

  const youtube = await prisma.platformAccount.create({
    data: {
      id: `yt-${suffix}`,
      ownerId,
      platform: 'YouTube',
      format: 'long',
      name: 'Muhe Studio',
      handle: '@muhestudio-seed',
      niche: 'Lofi',
      followers: 0,
      posts30d: 0,
      views30d: 0,
      engagement: 0,
      avgWatchMinutes: 7.2,
      completionRate: 44,
      status: 'Active',
      lastSync: new Date(Date.now() - 86_400_000),
    },
  })
  youtubeId = youtube.id

  const tiktok = await prisma.platformAccount.create({
    data: {
      id: `tt-${suffix}`,
      ownerId,
      platform: 'TikTok',
      format: 'short',
      name: 'Muhe Clips',
      handle: '@muheclips',
      niche: 'Lofi',
      followers: 1000,
      posts30d: 4,
      views30d: 5000,
      engagement: 5,
      avgWatchMinutes: 0.4,
      completionRate: 60,
      status: 'Active',
      lastSync: new Date(),
    },
  })
  tiktokId = tiktok.id

})

afterAll(async () => {
  vi.unstubAllGlobals()
  await prisma.platformAccount.deleteMany({ where: { ownerId } })
  await prisma.user.deleteMany({ where: { id: ownerId } })
  await app.close()
})

describe('syncYouTubeAccount', () => {
  it('menarik statistik channel dan video 30 hari dari Data API v3', async () => {
    stubYouTubeApi()
    const result = await syncYouTubeAccount(ownerId, youtubeId, 'test-key')

    expect(result.channel).toEqual({ id: 'UC_test', title: 'Muhe Studio' })
    expect(result.stats).toEqual({
      followers: 128400,
      views30d: 1000,
      posts30d: 1,
      engagement: 11,
    })

    const stored = await prisma.platformAccount.findUnique({ where: { id: youtubeId } })
    expect(stored?.followers).toBe(128400)
    expect(stored?.views30d).toBe(1000)
    expect(stored?.posts30d).toBe(1)
    expect(stored?.engagement).toBe(11)
    expect(stored?.lastSync?.getTime()).toBeGreaterThan(Date.now() - 60_000)
  })

  it('menolak tanpa YOUTUBE_API_KEY', async () => {
    await expect(syncYouTubeAccount(ownerId, youtubeId, undefined)).rejects.toMatchObject({
      statusCode: 503,
      code: 'YOUTUBE_NOT_CONFIGURED',
    })
  })

  it('menolak akun non-YouTube', async () => {
    await expect(syncYouTubeAccount(ownerId, tiktokId, 'test-key')).rejects.toMatchObject({
      statusCode: 400,
      code: 'UNSUPPORTED_PLATFORM',
    })
  })

  it('mengembalikan 404 saat channel tidak ditemukan', async () => {
    stubYouTubeApi({ emptyChannel: true })
    await expect(syncYouTubeAccount(ownerId, youtubeId, 'test-key')).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('melaporkan kegagalan per akun pada sync semua', async () => {
    stubYouTubeApi({ emptyChannel: true })
    const result = await syncAllYouTubeAccounts(ownerId, 'test-key')
    expect(result.synced).toBe(0)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]?.id).toBe(youtubeId)
  })
})

describe('YouTube OAuth 2.0', () => {
  afterAll(() => {
    clearOAuthEnv()
  })

  it('membangun URL consent dengan scope readonly + analytics', () => {
    setOAuthEnv()
    const url = new URL(buildGoogleAuthUrl('state-token'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe(oauthEnv.GOOGLE_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe(oauthEnv.GOOGLE_OAUTH_REDIRECT_URL)
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    const scope = url.searchParams.get('scope') ?? ''
    expect(scope).toContain('youtube.readonly')
    expect(scope).toContain('yt-analytics.readonly')
    expect(url.searchParams.get('state')).toBe('state-token')
  })

  it('menukar code, menyimpan refresh token, dan menarik watch time', async () => {
    setOAuthEnv()
    stubGoogleOAuth({ refreshToken: 'refresh-abc' })

    const result = await connectYouTubeWithCode(ownerId, 'auth-code', {
      format: 'short',
      niche: 'Edukasi',
    })

    expect(result.created).toBe(true)
    expect(result.channel).toEqual({ id: 'UC_oauth1234567', title: 'OAuth Studio' })
    expect(result.account).toMatchObject({
      handle: '@oauthstudio',
      niche: 'Edukasi',
      followers: 5400,
      views30d: 2400,
      avgWatchMinutes: 3.5,
      completionRate: 52,
    })

    const stored = await prisma.platformAccount.findFirst({
      where: { ownerId, externalId: 'UC_oauth1234567' },
    })
    expect(stored?.oauthRefreshToken).toBe('refresh-abc')
    expect(stored?.oauthScopes).toContain('yt-analytics.readonly')
  })

  it('menghubungkan ulang channel yang sama tanpa duplikasi', async () => {
    setOAuthEnv()
    stubGoogleOAuth({ refreshToken: null })

    const result = await connectYouTubeWithCode(ownerId, 'auth-code-2')

    expect(result.created).toBe(false)
    const accounts = await prisma.platformAccount.findMany({
      where: { ownerId, externalId: 'UC_oauth1234567' },
    })
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.oauthRefreshToken).toBe('refresh-abc')
  })

  it('GET /content/youtube/oauth/url mengembalikan URL consent', async () => {
    setOAuthEnv()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/youtube/oauth/url?format=short&niche=Lofi',
      headers: { 'x-owner-id': ownerId },
    })
    expect(response.statusCode).toBe(200)
    const url = new URL(response.json().url as string)
    expect(url.searchParams.get('state')).toBeTruthy()
    expect(url.searchParams.get('scope')).toContain('yt-analytics.readonly')
  })
})

describe('createYouTubeAccount', () => {
  it('menghubungkan channel dari URL dan menyimpan statistik awal', async () => {
    stubYouTubeApi()
    const result = await createYouTubeAccount(
      ownerId,
      { handle: 'https://www.youtube.com/@muhestudio', format: 'short', niche: 'Lofi' },
      'test-key',
    )

    expect(result.channel).toEqual({ id: 'UC_test', title: 'Muhe Studio' })
    expect(result.account).toMatchObject({
      platform: 'YouTube',
      format: 'short',
      name: 'Muhe Studio',
      handle: '@muhestudio',
      niche: 'Lofi',
      followers: 128400,
      posts30d: 1,
      views30d: 1000,
    })

    const stored = await prisma.platformAccount.findFirst({
      where: { ownerId, handle: '@muhestudio' },
    })
    expect(stored?.id).toBe((result.account as { id: string }).id)
  })

  it('menolak channel yang sudah terhubung', async () => {
    stubYouTubeApi()
    await expect(
      createYouTubeAccount(ownerId, { handle: '@muhestudio' }, 'test-key'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ACCOUNT_EXISTS' })
  })

  it('menerima input channel ID UC...', async () => {
    const fetchMock = stubYouTubeApi({
      channelId: 'UC_other1234567',
      title: 'Other Studio',
      customUrl: '@otherstudio',
    })
    await createYouTubeAccount(
      ownerId,
      { handle: 'https://youtube.com/channel/UC_other1234567' },
      'test-key',
    )
    const channelsCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('/channels'),
    )
    expect(String(channelsCall?.[0])).toContain('id=UC_other1234567')
  })

  it('menolak tanpa YOUTUBE_API_KEY', async () => {
    await expect(
      createYouTubeAccount(ownerId, { handle: '@someone' }, undefined),
    ).rejects.toMatchObject({ statusCode: 503, code: 'YOUTUBE_NOT_CONFIGURED' })
  })
})

describe('POST /content/accounts/:id/sync', () => {
  it('mengembalikan 503 bila API key belum diatur', async () => {
    const previous = process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_API_KEY
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/content/accounts/${youtubeId}/sync`,
        headers: { 'x-owner-id': ownerId },
      })
      expect(response.statusCode).toBe(503)
      expect(response.json().error.code).toBe('YOUTUBE_NOT_CONFIGURED')
    } finally {
      if (previous !== undefined) process.env.YOUTUBE_API_KEY = previous
    }
  })
})
