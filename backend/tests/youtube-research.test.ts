import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAgentSnapshot } from '../src/agent/snapshot.js'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'
import {
  buildResearchQueries,
  clearYouTubeResearchCache,
  researchYouTube,
} from '../src/services/youtube-research.js'

const suffix = randomUUID().slice(0, 8)
const ownerId = `usr-youtube-research-${suffix}`
const accountId = `yt-research-${suffix}`
const DAY_MS = 86_400_000

const app = await buildApp({
  config: { ...loadConfig(), swaggerEnabled: false },
  logger: false,
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function stubResearchApi(options: { empty?: boolean; noBaseline?: boolean } = {}) {
  const now = Date.now()
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    const path = url.pathname.split('/').pop()

    if (path === 'search') {
      if (options.empty) return json({ items: [] })
      return json({
        items: [
          {
            id: { videoId: 'vid-a' },
            snippet: {
              title: 'Lofi beats untuk belajar',
              channelId: 'UC_A',
              channelTitle: 'Alpha Lofi',
              publishedAt: new Date(now - 10 * DAY_MS).toISOString(),
            },
          },
          {
            id: { videoId: 'vid-b' },
            snippet: {
              title: 'Lofi untuk tidur',
              channelId: 'UC_A',
              channelTitle: 'Alpha Lofi',
              publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
            },
          },
          {
            id: { videoId: 'vid-c' },
            snippet: {
              title: 'Lofi radio panjang',
              channelId: 'UC_B',
              channelTitle: 'Beta Radio',
              publishedAt: new Date(now - 30 * DAY_MS).toISOString(),
            },
          },
        ],
      })
    }

    if (path === 'videos') {
      const requested = new Set((url.searchParams.get('id') ?? '').split(',').filter(Boolean))
      const items = [
        {
          id: 'vid-a',
          snippet: {
            title: 'Lofi beats untuk belajar',
            channelId: 'UC_A',
            channelTitle: 'Alpha Lofi',
            publishedAt: new Date(now - 10 * DAY_MS).toISOString(),
            tags: ['lofi', 'study'],
          },
          statistics: { viewCount: '10000', likeCount: '800', commentCount: '40' },
          contentDetails: { duration: 'PT45S' },
        },
        {
          id: 'vid-b',
          snippet: {
            title: 'Lofi untuk tidur',
            channelId: 'UC_A',
            channelTitle: 'Alpha Lofi',
            publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
            tags: ['lofi', 'sleep'],
          },
          statistics: { viewCount: '150000', likeCount: '9000', commentCount: '500' },
          contentDetails: { duration: 'PT10M' },
        },
        {
          id: 'vid-c',
          snippet: {
            title: 'Lofi radio panjang',
            channelId: 'UC_B',
            channelTitle: 'Beta Radio',
            publishedAt: new Date(now - 30 * DAY_MS).toISOString(),
            tags: ['lofi', 'radio'],
          },
          statistics: { viewCount: '50000', likeCount: '3000', commentCount: '200' },
          contentDetails: { duration: 'PT8M' },
        },
        { id: 'base-a1', statistics: { viewCount: '8000' }, snippet: {}, contentDetails: {} },
        { id: 'base-a2', statistics: { viewCount: '12000' }, snippet: {}, contentDetails: {} },
        { id: 'base-a3', statistics: { viewCount: '10000' }, snippet: {}, contentDetails: {} },
        { id: 'base-b1', statistics: { viewCount: '40000' }, snippet: {}, contentDetails: {} },
        { id: 'base-b2', statistics: { viewCount: '60000' }, snippet: {}, contentDetails: {} },
        { id: 'base-b3', statistics: { viewCount: '50000' }, snippet: {}, contentDetails: {} },
      ]
      return json({ items: items.filter((item) => requested.has(item.id)) })
    }

    if (path === 'channels') {
      return json({
        items: [
          {
            id: 'UC_A',
            snippet: { title: 'Alpha Lofi' },
            statistics: { subscriberCount: '5000' },
            contentDetails: { relatedPlaylists: { uploads: 'UU_A' } },
          },
          {
            id: 'UC_B',
            snippet: { title: 'Beta Radio' },
            statistics: { subscriberCount: '50000' },
            contentDetails: { relatedPlaylists: { uploads: 'UU_B' } },
          },
        ],
      })
    }

    if (path === 'playlistItems') {
      if (options.noBaseline) return json({ items: [] })
      const playlistId = url.searchParams.get('playlistId')
      const ids =
        playlistId === 'UU_A'
          ? ['base-a1', 'base-a2', 'base-a3']
          : playlistId === 'UU_B'
            ? ['base-b1', 'base-b2', 'base-b3']
            : []
      return json({ items: ids.map((videoId) => ({ contentDetails: { videoId } })) })
    }

    return json({ error: { message: `unexpected path ${path}` } }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeAll(async () => {
  await prisma.user.create({
    data: {
      id: ownerId,
      email: `youtube-research-${suffix}@nuanscape.test`,
      name: 'YouTube Research Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  await prisma.platformAccount.create({
    data: {
      id: accountId,
      ownerId,
      platform: 'YouTube',
      format: 'long',
      name: 'Riset Lofi',
      handle: '@risetlofi',
      niche: 'Lofi',
      followers: 1200,
      posts30d: 2,
      views30d: 5000,
      engagement: 4,
      avgWatchMinutes: 6,
      completionRate: 40,
      status: 'Growing',
      lastSync: new Date(),
    },
  })
})

beforeEach(() => {
  clearYouTubeResearchCache()
  vi.stubEnv('YOUTUBE_API_KEY', 'test-key')
  vi.stubEnv('YOUTUBE_RESEARCH_ENABLED', 'true')
  vi.stubEnv('YOUTUBE_RESEARCH_CACHE_MS', '3600000')
  vi.stubEnv('YOUTUBE_REGION_CODE', 'ID')
  vi.stubEnv('YOUTUBE_RELEVANCE_LANGUAGE', 'id')
})

afterEach(() => {
  clearYouTubeResearchCache()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

afterAll(async () => {
  await prisma.platformAccount.deleteMany({ where: { ownerId } })
  await prisma.user.deleteMany({ where: { id: ownerId } })
  await app.close()
})

describe('YouTube research', () => {
  it('mengambil search, detail video, dan subscriber lalu menghitung outlier', async () => {
    const fetchMock = stubResearchApi()
    const result = await researchYouTube({ query: 'lofi', days: 30, maxResults: 10 })

    expect(result.configured).toBe(true)
    expect(result.query).toBe('lofi')
    expect(result.windowDays).toBe(30)
    expect(result.videos).toHaveLength(3)
    expect(result.videos[0]).toMatchObject({
      videoId: 'vid-b',
      outlierRatio: 15,
      outlierBasis: 'channel',
      channelMedianViews: 10000,
      baselineSampleSize: 3,
      smallChannel: true,
      breakout: true,
    })
    expect(result.videos[0]?.subscriberCount).toBe(5000)
    expect(result.patterns).toMatchObject({
      sampleSize: 3,
      queryCount: 1,
      channelBaselineCount: 2,
      breakoutCount: 1,
      medianViews: 50000,
      shortsShare: 33.3,
    })
    expect(result.patterns.topKeywords.some((entry) => entry.term === 'lofi')).toBe(true)
    expect(result.patterns.topTags[0]).toEqual({ tag: 'lofi', count: 3 })
    expect(result.patterns.durationBuckets.map((bucket) => bucket.count)).toEqual([1, 1, 1])
    expect(result.patterns.topChannels[0]?.channelId).toBe('UC_A')

    const searchCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('/search?'),
    )
    expect(searchCall).toBeDefined()
    const searchUrl = new URL(String(searchCall?.[0]))
    expect(searchUrl.searchParams.get('q')).toBe('lofi')
    expect(searchUrl.searchParams.get('regionCode')).toBe('ID')
    expect(searchUrl.searchParams.get('relevanceLanguage')).toBe('id')
    expect(searchUrl.searchParams.get('key')).toBe('test-key')
  })

  it('mengembalikan empty state tanpa mengarang video saat tidak ada hasil', async () => {
    stubResearchApi({ empty: true })
    const result = await researchYouTube({ query: 'tidak-ada-hasil', days: 30 })

    expect(result.configured).toBe(true)
    expect(result.videos).toEqual([])
    expect(result.patterns.sampleSize).toBe(0)
    expect(result.patterns.medianViews).toBe(0)
  })

  it('menolak tanpa YOUTUBE_API_KEY', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')

    await expect(researchYouTube({ query: 'lofi' })).rejects.toMatchObject({
      statusCode: 503,
      code: 'YOUTUBE_NOT_CONFIGURED',
    })
  })

  it('memakai cache untuk query yang sama', async () => {
    const fetchMock = stubResearchApi()
    await researchYouTube({ query: 'lofi', days: 30 })
    await researchYouTube({ query: 'lofi', days: 30 })

    expect(fetchMock).toHaveBeenCalledTimes(7)
  })

  it('menjalankan multi-query dan pencarian tanggal tanpa duplikasi video', async () => {
    const fetchMock = stubResearchApi()
    const result = await researchYouTube({
      query: 'lofi',
      queries: ['lofi', 'lofi belajar', 'lofi tidur'],
      days: 30,
      cacheTtlMs: 0,
    })

    expect(result.queries).toEqual(['lofi', 'lofi belajar', 'lofi tidur'])
    expect(result.patterns.queryCount).toBe(3)
    const searchCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/search?'))
    expect(searchCalls).toHaveLength(4)
    const orders = searchCalls.map(([input]) => new URL(String(input)).searchParams.get('order'))
    expect(orders).toEqual(['relevance', 'relevance', 'relevance', 'date'])
    expect(result.videos.map((video) => video.videoId).sort()).toEqual(['vid-a', 'vid-b', 'vid-c'])
  })

  it('memakai baseline sampel tanpa menyebut breakout saat playlist kosong', async () => {
    stubResearchApi({ noBaseline: true })
    const result = await researchYouTube({ query: 'lofi', days: 30, cacheTtlMs: 0 })

    expect(result.videos.every((video) => video.outlierBasis === 'sample')).toBe(true)
    expect(result.videos.every((video) => video.breakout === false)).toBe(true)
    expect(result.patterns.channelBaselineCount).toBe(0)
    expect(result.patterns.breakoutCount).toBe(0)
  })

  it('membangun query spesifik dari judul konten dan membuang seed generik', () => {
    const queries = buildResearchQueries(
      ['General', 'Music', 'Lofi'],
      ['Lofi beats untuk belajar', 'Belajar fokus dengan lofi'],
    )

    expect(queries[0]).toBe('Lofi')
    expect(queries.length).toBeLessThanOrEqual(3)
    expect(queries).not.toContain('General')
    expect(queries).not.toContain('Music')
  })

  it('GET /content/youtube/research mengembalikan hasil riset', async () => {
    stubResearchApi()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/youtube/research?q=lofi&days=30&maxResults=10',
      headers: { 'x-owner-id': ownerId },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.configured).toBe(true)
    expect(body.videos).toHaveLength(3)
    expect(body.videos[0]?.videoId).toBe('vid-b')
  })

  it('buildAgentSnapshot mengisi content.youtubeResearch dari niche akun', async () => {
    stubResearchApi()
    const snapshot = await buildAgentSnapshot(ownerId)

    expect(snapshot.content.youtubeResearch.configured).toBe(true)
    expect(snapshot.content.youtubeResearch.query).toBe('Lofi')
    expect(snapshot.content.youtubeResearch.videos).toHaveLength(3)
  })

  it('snapshot tetap jalan saat YOUTUBE_API_KEY kosong', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
    const snapshot = await buildAgentSnapshot(ownerId)

    expect(snapshot.content.youtubeResearch.configured).toBe(false)
    expect(snapshot.content.youtubeResearch.videos).toEqual([])
    expect(snapshot.content.youtubeResearch.reason).toContain('YOUTUBE_API_KEY')
  })
})
