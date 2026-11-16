import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `content-v2-${suffix}@nuanscape.test`
let ownerId = ''
let ideaId = ''

function headers(id: string) {
  return { 'x-owner-id': id }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Content V2 Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  // Create 9 platform accounts (3 YT, 3 TT, 3 IG)
  const accountsData = [
    { id: `yt-1-${suffix}`, platform: 'YouTube' as const, format: 'long' as const, name: 'YT Studio', handle: '@yt1', niche: 'Music', followers: 50000, posts30d: 4, views30d: 100000, engagement: 5, avgWatchMinutes: 8, completionRate: 50, status: 'Active' as const, lastSync: new Date() },
    { id: `yt-2-${suffix}`, platform: 'YouTube' as const, format: 'long' as const, name: 'YT Chill', handle: '@yt2', niche: 'Lofi', followers: 30000, posts30d: 6, views30d: 80000, engagement: 6, avgWatchMinutes: 10, completionRate: 55, status: 'Growing' as const, lastSync: new Date() },
    { id: `yt-3-${suffix}`, platform: 'YouTube' as const, format: 'long' as const, name: 'YT Labs', handle: '@yt3', niche: 'HipHop', followers: 20000, posts30d: 3, views30d: 40000, engagement: 4, avgWatchMinutes: 7, completionRate: 45, status: 'Growing' as const, lastSync: new Date() },
    { id: `tt-1-${suffix}`, platform: 'TikTok' as const, format: 'short' as const, name: 'TT Daily', handle: '@tt1', niche: 'Lofi', followers: 100000, posts30d: 20, views30d: 1500000, engagement: 12, avgWatchMinutes: 0.8, completionRate: 40, status: 'Active' as const, lastSync: new Date() },
    { id: `tt-2-${suffix}`, platform: 'TikTok' as const, format: 'short' as const, name: 'TT Clips', handle: '@tt2', niche: 'Retro', followers: 40000, posts30d: 15, views30d: 400000, engagement: 9, avgWatchMinutes: 0.5, completionRate: 35, status: 'Growing' as const, lastSync: new Date() },
    { id: `tt-3-${suffix}`, platform: 'TikTok' as const, format: 'short' as const, name: 'TT Notes', handle: '@tt3', niche: 'BoomBap', followers: 70000, posts30d: 18, views30d: 900000, engagement: 10, avgWatchMinutes: 0.6, completionRate: 38, status: 'Active' as const, lastSync: new Date() },
    { id: `ig-1-${suffix}`, platform: 'Instagram' as const, format: 'short' as const, name: 'IG Co', handle: '@ig1', niche: 'Visual', followers: 60000, posts30d: 12, views30d: 500000, engagement: 8, avgWatchMinutes: 0.4, completionRate: 35, status: 'Active' as const, lastSync: new Date() },
    { id: `ig-2-${suffix}`, platform: 'Instagram' as const, format: 'short' as const, name: 'IG Lab', handle: '@ig2', niche: 'Retro', followers: 15000, posts30d: 8, views30d: 120000, engagement: 7, avgWatchMinutes: 0.3, completionRate: 30, status: 'Paused' as const, lastSync: new Date() },
    { id: `ig-3-${suffix}`, platform: 'Instagram' as const, format: 'short' as const, name: 'IG Reels', handle: '@ig3', niche: 'HipHop', followers: 25000, posts30d: 10, views30d: 300000, engagement: 8, avgWatchMinutes: 0.4, completionRate: 33, status: 'Growing' as const, lastSync: new Date() },
  ]

  for (const acc of accountsData) {
    await prisma.platformAccount.create({ data: { ...acc, ownerId } })
  }

  // Create an initial idea
  const idea = await prisma.contentIdea.create({
    data: {
      ownerId,
      title: 'Ide Video Konspirasi AI',
      hook: 'Apakah AI sudah menulis lagu terpopuler di dunia?',
      platform: 'YouTube',
      accountId: `yt-1-${suffix}`,
      niche: 'Music',
      angle: 'Investigasi & Analisis',
      format: 'long',
      score: 95,
      status: 'draft',
    },
  })
  ideaId = idea.id

  // Create content energy
  await prisma.contentEnergy.create({
    data: {
      ownerId,
      current: 100,
      max: 100,
    },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: ownerId } })
  await app.close()
})

describe('Content V2 - 9 Platform Accounts', () => {
  it('GET /content/accounts - mengembalikan 9 akun multi-platform', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/content/accounts',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const accounts = res.json().accounts
    expect(accounts.length).toBe(9)
  })

  it('GET /content/accounts?format=long - filter 3 akun format long (YouTube)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/content/accounts?format=long',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const accounts = res.json().accounts
    expect(accounts.length).toBe(3)
    expect(accounts.every((a: { platform: string }) => a.platform === 'YouTube')).toBe(true)
  })

  it('GET /content/accounts?format=short - filter 6 akun format short (TikTok & Instagram)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/content/accounts?format=short',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const accounts = res.json().accounts
    expect(accounts.length).toBe(6)
  })
})

describe('Content V2 - Energy & Generate Flow', () => {
  it('GET /content/energy - cek saldo awal 100 energy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/content/energy',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.current).toBe(100)
    expect(json.max).toBe(100)
    expect(json.remainingGenerations).toBe(10)
  })

  it('POST /content/generate-draft - generate draft dari ide dan kurangi 10 energy', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/generate-draft',
      headers: headers(ownerId),
      payload: {
        ideaId,
        platform: 'YouTube',
        accountId: `yt-1-${suffix}`,
        thumbnailStyle: 'Cinematic Dark',
        animationStyle: 'Motion Graphic Minimalist',
        musicStyle: 'Lofi Ambient Beats',
      },
    })
    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.item.title).toBe('Ide Video Konspirasi AI')
    expect(json.item.status).toBe('Draft')
    expect(json.item.generated).toBe(true)
    expect(json.item.sourceIdeaId).toBe(ideaId)
    expect(json.item.thumbnailStyle).toBe('Cinematic Dark')
    expect(json.energy.current).toBe(90)
    expect(json.energy.remainingGenerations).toBe(9)

    // Ide harus berubah status menjadi completed
    const ideaRes = await prisma.contentIdea.findUnique({ where: { id: ideaId } })
    expect(ideaRes?.status).toBe('completed')
  })

  it('POST /content/ideas/:id/reject - menolak ide konten', async () => {
    const newIdea = await prisma.contentIdea.create({
      data: {
        ownerId,
        title: 'Ide Kurang Relevan',
        hook: 'Topik usang',
        platform: 'TikTok',
        niche: 'Random',
        angle: 'Opini',
        format: 'short',
        score: 40,
        status: 'draft',
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/content/ideas/${newIdea.id}/reject`,
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().idea.status).toBe('rejected')
  })

  it('POST /content/energy/recharge - isi ulang energy ke 100', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/energy/recharge',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.current).toBe(100)
    expect(json.remainingGenerations).toBe(10)
  })

  it('POST /content/generate-draft - gagal dengan 400 jika energy tidak cukup', async () => {
    // Kuras energy menjadi 0
    await prisma.contentEnergy.update({
      where: { ownerId },
      data: { current: 5 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/generate-draft',
      headers: headers(ownerId),
      payload: {
        title: 'Draft Gagal Energy',
        platform: 'TikTok',
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INSUFFICIENT_ENERGY')

    // Pulihkan energy
    await prisma.contentEnergy.update({
      where: { ownerId },
      data: { current: 100 },
    })
  })

  it('POST /content/generate-production - musik wajib animasi AI (tanpa fallback loop lokal)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/generate-production',
      headers: headers(ownerId),
      payload: {
        contentType: 'music',
        title: 'Lofi Study Night Mix',
        platform: 'YouTube',
        accountId: `yt-1-${suffix}`,
        brief: 'Lofi beats tenang untuk belajar larut malam.',
        audioLength: '12 detik',
        audioEnergy: 'Chill',
        thumbnailStyle: 'vinyl',
        animationStyle: 'audio-reactive',
        musicStyle: 'lofi',
      },
    })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toMatch(/^AI_VIDEO_/)
  })

  it('POST /content/generate-production - generate paket produksi konspirasi dengan scenes & klaim', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/generate-production',
      headers: headers(ownerId),
      payload: {
        contentType: 'konspirasi',
        title: 'Misteri Sinyal Radio 1977',
        platform: 'YouTube',
        script: 'Naskah investigasi sinyal luar angkasa.',
        disclaimer: 'Konten ini untuk tujuan edukasi dan analisa.',
        thumbnailStyle: 'evidence',
        animationStyle: 'parallax',
        musicStyle: 'dark-ambient',
        scenes: [
          {
            title: 'Klaim Awal',
            narration: 'Sinyal terdeteksi selama 72 detik.',
            visual: 'Papan bukti observatorium.',
            animation: 'parallax',
            duration: 8,
            claimType: 'Fakta',
            source: 'Big Ear Observatory Archive',
          },
          {
            title: 'Teori Asal',
            narration: 'Beberapa pihak menduga transmisi buatan.',
            visual: 'Spektrogram sinyal dan frekuensi.',
            animation: 'glitch',
            duration: 12,
            claimType: 'Spekulasi',
            source: 'Forum SETI',
          },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.item.title).toBe('Misteri Sinyal Radio 1977')
    expect(json.media.scenes.length).toBe(2)
    expect(json.media.productionPackText).toContain('Klaim: Fakta')
    expect(json.media.audioPrompt).toContain('Dark ambient drone')
    expect(json.energy.current).toBe(90)
  })
})

describe('Content V2 - Agent Report API (Bambang)', () => {
  it('GET /content/agent-report - laporan performa dan status agen Bambang', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/content/agent-report',
      headers: headers(ownerId),
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.agent.name).toBe('Bambang')
    expect(json.agent.role).toBe('Content Production Agent')
    expect(json.energy).toBeDefined()
    expect(json.summary).toBeDefined()
    expect(json.statusCounts).toBeDefined()
    expect(Array.isArray(json.needsReview)).toBe(true)
    expect(Array.isArray(json.upcomingPublications)).toBe(true)
    expect(Array.isArray(json.accounts)).toBe(true)
    expect(json.accounts.length).toBe(9)
    expect(json.ideas).toBeDefined()
    expect(Array.isArray(json.recommendations)).toBe(true)
  })
})
