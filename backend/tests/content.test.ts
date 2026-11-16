import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `content-test-${suffix}@nuanscape.test`
const otherEmail = `content-other-${suffix}@nuanscape.test`
const accountId = `test-yt-${suffix}`
const ideaId = `test-idea-${suffix}`

let ownerId = ''
let otherId = ''
let createdItemId = ''
let promotedItemId = ''
let assetId = ''

function headers(id: string) {
  return { 'x-owner-id': id }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Content Test Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  const other = await prisma.user.create({
    data: {
      email: otherEmail,
      name: 'Content Other Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  otherId = other.id

  await prisma.platformAccount.create({
    data: {
      id: accountId,
      ownerId,
      platform: 'YouTube',
      format: 'long',
      name: 'Test YouTube',
      handle: `@test-${suffix}`,
      niche: 'Testing',
      followers: 1000,
      posts30d: 1,
      views30d: 1000,
      engagement: 5,
      avgWatchMinutes: 2,
      completionRate: 30,
      status: 'Active',
      lastSync: new Date(),
    },
  })

  await prisma.contentIdea.create({
    data: {
      id: ideaId,
      ownerId,
      title: 'Ide uji integrasi backend',
      hook: 'Hook uji integrasi konten.',
      platform: 'YouTube',
      accountId,
      niche: 'Testing',
      angle: 'Uji',
      format: 'Long-form mix',
      score: 80,
    },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } })
  await prisma.$disconnect()
  await app.close()
})

describe('content routes', () => {
  it('membuat, membaca, mengubah, memfilter, dan menghapus konten', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/content/items',
      headers: headers(ownerId),
      payload: {
        title: 'Konten uji integrasi backend',
        platform: 'YouTube',
        accountId,
        niche: 'Testing',
        format: 'Long-form mix · 1 jam',
        scheduledAt: '2026-11-20T13:00:00.000Z',
        hashtags: ['qa'],
      },
    })

    expect(create.statusCode).toBe(201)
    const created = create.json()
    createdItemId = created.item.id
    expect(created.item.status).toBe('Draft')
    expect(created.item.accountId).toBe(accountId)
    expect(created.item.hashtags).toEqual(['qa'])

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/content/items?q=uji%20integrasi',
      headers: headers(ownerId),
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().items).toHaveLength(1)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/content/items/${createdItemId}`,
      headers: headers(ownerId),
    })
    expect(detail.statusCode).toBe(200)

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/content/items/${createdItemId}`,
      headers: headers(ownerId),
      payload: { status: 'Script Ready', script: 'Hook 0-3 detik, lalu breakdown.' },
    })
    expect(patch.statusCode).toBe(200)
    expect(patch.json().item).toMatchObject({
      status: 'Script Ready',
      script: 'Hook 0-3 detik, lalu breakdown.',
    })

    const scripts = await app.inject({
      method: 'GET',
      url: '/api/v1/content/items?hasScript=true',
      headers: headers(ownerId),
    })
    expect(scripts.json().items).toHaveLength(1)
  })

  it('menolak akun yang tidak cocok dengan platform', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content/items',
      headers: headers(ownerId),
      payload: {
        title: 'Konten platform salah',
        platform: 'TikTok',
        accountId,
        niche: 'Testing',
        format: 'Short-form',
        scheduledAt: '2026-11-21T13:00:00.000Z',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: { code: 'ACCOUNT_PLATFORM_MISMATCH' },
    })
  })

  it('mempromosikan ide menjadi konten dan menandainya approved', async () => {
    const promote = await app.inject({
      method: 'POST',
      url: `/api/v1/content/ideas/${ideaId}/promote`,
      headers: headers(ownerId),
      payload: {},
    })

    expect(promote.statusCode).toBe(201)
    const body = promote.json()
    promotedItemId = body.item.id
    expect(body.item.status).toBe('Approved')
    expect(body.idea.approved).toBe(true)

    const approved = await app.inject({
      method: 'GET',
      url: '/api/v1/content/ideas?approved=true',
      headers: headers(ownerId),
    })
    expect(approved.json().ideas).toHaveLength(1)
  })

  it('menambah aset library dan memfilter berdasarkan konten', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/content/library',
      headers: headers(ownerId),
      payload: {
        name: 'qa-asset.png',
        type: 'Image',
        platform: 'YouTube',
        accountId,
        size: '1 MB',
        contentId: createdItemId,
      },
    })

    expect(create.statusCode).toBe(201)
    assetId = create.json().asset.id
    expect(create.json().asset.contentId).toBe(createdItemId)

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/content/library?contentId=${createdItemId}`,
      headers: headers(ownerId),
    })
    expect(list.json().assets).toHaveLength(1)
  })

  it('menyajikan overview, analytics, calendar, dan detail akun', async () => {
    const overview = await app.inject({
      method: 'GET',
      url: '/api/v1/content/overview',
      headers: headers(ownerId),
    })
    expect(overview.statusCode).toBe(200)
    expect(overview.json().formats.long.summary.items).toBeGreaterThanOrEqual(2)
    expect(overview.json().formats.long.stageCounts.scripts).toBe(1)
    expect(overview.json().totals.assets).toBe(1)

    const analytics = await app.inject({
      method: 'GET',
      url: '/api/v1/content/analytics?format=long',
      headers: headers(ownerId),
    })
    expect(analytics.statusCode).toBe(200)
    expect(analytics.json().series).toHaveLength(7)

    const calendar = await app.inject({
      method: 'GET',
      url: '/api/v1/content/calendar?format=long&month=2026-11',
      headers: headers(ownerId),
    })
    expect(calendar.statusCode).toBe(200)
    expect(calendar.json().month).toBe('2026-11')

    const account = await app.inject({
      method: 'GET',
      url: `/api/v1/content/accounts/${accountId}`,
      headers: headers(ownerId),
    })
    expect(account.statusCode).toBe(200)
    expect(account.json().account.id).toBe(accountId)
    expect(account.json().stats.items).toBeGreaterThanOrEqual(2)
  })

  it('mengisolasi data antar owner', async () => {
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/content/items/${createdItemId}`,
      headers: headers(otherId),
    })
    expect(detail.statusCode).toBe(404)

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/v1/content/items/${createdItemId}`,
      headers: headers(otherId),
    })
    expect(remove.statusCode).toBe(404)
  })

  it('menghapus konten milik owner', async () => {
    for (const id of [createdItemId, promotedItemId]) {
      const remove = await app.inject({
        method: 'DELETE',
        url: `/api/v1/content/items/${id}`,
        headers: headers(ownerId),
      })
      expect(remove.statusCode).toBe(200)
    }

    await prisma.libraryAsset.deleteMany({ where: { id: assetId } })
  })
})
