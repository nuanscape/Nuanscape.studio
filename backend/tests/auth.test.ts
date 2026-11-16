import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

process.env.DEMO_ADMIN_PIN ??= '2468'
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long'

const email = `auth-test-${randomUUID().slice(0, 8)}@example.com`
const password = 'Rahasia123'
const newPassword = 'Rahasia456'

let app: FastifyInstance
let accessToken = ''
let refreshToken = ''
let loginAccessToken = ''
let loginRefreshToken = ''
let newRefreshToken = ''
let rotatedAccessToken = ''

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  app = await buildApp({ logger: false })
  await app.ready()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } })
  await app.close()
})

describe('M1 auth & profil', () => {
  it('register membuat user, sesi, dan preferensi default', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Ariq Test', email, password },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.user.email).toBe(email)
    expect(body.user.name).toBe('Ariq Test')
    expect(body.user.initials).toBe('AT')
    expect(body.user.plan).toBe('Studio')
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.expiresIn).toBe(900)

    accessToken = body.accessToken
    refreshToken = body.refreshToken

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: auth(accessToken),
    })
    expect(me.statusCode).toBe(200)
    const meBody = me.json()
    expect(meBody.preferences.currency).toBe('IDR')
    expect(meBody.preferences.notifications.stock).toBe(true)
    expect(meBody.preferences.ai.tone).toBe('Ringkas dan langsung')
  })

  it('register email duplikat mengembalikan 409 EMAIL_TAKEN', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Duplikat', email, password },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('EMAIL_TAKEN')
  })

  it('login password salah mengembalikan 401 INVALID_CREDENTIALS', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'salah-total' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('login benar mengembalikan pasangan token baru', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.user.email).toBe(email)
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.refreshToken).not.toBe(refreshToken)

    loginAccessToken = body.accessToken
    loginRefreshToken = body.refreshToken
  })

  it('me tanpa token mengembalikan 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHORIZED')
  })

  it('me dengan Bearer token mengembalikan profil', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: auth(accessToken),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().user.email).toBe(email)
  })

  it('patch profil memperbarui nama, role, dan timezone', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/me',
      headers: auth(accessToken),
      payload: { name: 'Ariq Nuanscape', role: 'Founder', timezone: 'Asia/Makassar' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.user.name).toBe('Ariq Nuanscape')
    expect(body.user.initials).toBe('AN')
    expect(body.user.role).toBe('Founder')
    expect(body.user.timezone).toBe('Asia/Makassar')
  })

  it('patch preferensi menyimpan notifikasi dan pengaturan AI', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/preferences',
      headers: auth(accessToken),
      payload: {
        weekStart: 'Minggu',
        compact: false,
        notifications: { content: true, email: true },
        ai: { tone: 'Detail dengan alasan', approval: false },
      },
    })

    expect(response.statusCode).toBe(200)
    const preferences = response.json().preferences
    expect(preferences.weekStart).toBe('Minggu')
    expect(preferences.compact).toBe(false)
    expect(preferences.notifications.content).toBe(true)
    expect(preferences.notifications.email).toBe(true)
    expect(preferences.ai.tone).toBe('Detail dengan alasan')
    expect(preferences.ai.approval).toBe(false)
  })

  it('ganti password menolak password lama yang salah', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: auth(accessToken),
      payload: { currentPassword: 'bukan-password', newPassword },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('ganti password mencabut sesi lain dan memakai password baru', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: auth(accessToken),
      payload: { currentPassword: password, newPassword },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().revokedSessions).toBeGreaterThanOrEqual(1)

    const revokedSession = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: auth(loginAccessToken),
    })
    expect(revokedSession.statusCode).toBe(401)

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    })
    expect(oldLogin.statusCode).toBe(401)

    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: newPassword },
    })
    expect(newLogin.statusCode).toBe(200)
    newRefreshToken = newLogin.json().refreshToken
  })

  it('refresh merotasi token dan menolak refresh lama', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: newRefreshToken },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.refreshToken).not.toBe(newRefreshToken)
    rotatedAccessToken = body.accessToken

    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: newRefreshToken },
    })
    expect(replay.statusCode).toBe(401)
    expect(replay.json().error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('daftar sesi hanya memuat sesi aktif dan menandai sesi saat ini', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/sessions',
      headers: auth(rotatedAccessToken),
    })

    expect(response.statusCode).toBe(200)
    const sessions = response.json().sessions as Array<{ id: string; current: boolean }>
    expect(sessions.length).toBeGreaterThanOrEqual(1)
    expect(sessions.filter((session) => session.current)).toHaveLength(1)

    const current = sessions.find((session) => session.current)
    const revokeCurrent = await app.inject({
      method: 'DELETE',
      url: `/api/v1/auth/sessions/${current?.id}`,
      headers: auth(rotatedAccessToken),
    })
    expect(revokeCurrent.statusCode).toBe(400)
    expect(revokeCurrent.json().error.code).toBe('CURRENT_SESSION')

    const missing = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/sessions/tidak-ada',
      headers: auth(rotatedAccessToken),
    })
    expect(missing.statusCode).toBe(404)
  })

  it('logout mencabut sesi sehingga access token tidak berlaku lagi', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: auth(rotatedAccessToken),
    })
    expect(response.statusCode).toBe(200)

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: auth(rotatedAccessToken),
    })
    expect(me.statusCode).toBe(401)
  })

  it('login PIN admin menolak PIN salah dan menerima PIN benar', async () => {
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin',
      payload: { pin: '0000' },
    })
    expect(wrong.statusCode).toBe(401)
    expect(wrong.json().error.code).toBe('INVALID_ADMIN_PIN')

    const correct = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin',
      payload: { pin: process.env.DEMO_ADMIN_PIN },
    })
    expect(correct.statusCode).toBe(200)
    const body = correct.json()
    expect(body.admin).toBe(true)
    expect(body.user.email).toBe(process.env.DEMO_OWNER_EMAIL ?? 'demo@nuanscape.studio')

    const content = await app.inject({
      method: 'GET',
      url: '/api/v1/content/overview',
      headers: auth(body.accessToken),
    })
    expect(content.statusCode).toBe(200)
  })

  it('refresh token dari sesi yang dicabut tidak bisa dipakai', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: loginRefreshToken },
    })
    expect(response.statusCode).toBe(401)
  })
})
