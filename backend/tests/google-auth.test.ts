import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.GOOGLE_OAUTH_REDIRECT_URL =
  'http://localhost:8790/api/v1/content/youtube/oauth/callback'
process.env.FRONTEND_URL = 'http://localhost:5173'

const email = `google-login-${randomUUID().slice(0, 8)}@example.com`
const googleSub = `google-sub-${randomUUID()}`

let app: FastifyInstance
const originalFetch = globalThis.fetch

function stubGoogle(overrides: { verified?: boolean } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'google-access-token',
          expires_in: 3600,
          scope: 'openid email profile',
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    if (url.startsWith('https://openidconnect.googleapis.com/v1/userinfo')) {
      return new Response(
        JSON.stringify({
          sub: googleSub,
          email,
          email_verified: overrides.verified ?? true,
          name: 'Google Tester',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    throw new Error(`Fetch tidak terduga: ${url}`)
  })
}

function loginStateFrom(url: string): string {
  const parsed = new URL(url)
  const state = parsed.searchParams.get('state')
  expect(state).toBeTruthy()
  return state as string
}

describe('Login Google OAuth', () => {
  beforeAll(async () => {
    app = await buildApp({ logger: false })
    await app.ready()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } })
    globalThis.fetch = originalFetch
    await app.close()
  })

  it('mengembalikan URL consent Google untuk login', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/url?next=%2Fapp%2Fcontent%2Faccount',
    })

    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    const parsed = new URL(url)
    expect(parsed.host).toBe('accounts.google.com')
    expect(parsed.searchParams.get('scope')).toBe('openid email profile')
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'http://localhost:8790/api/v1/content/youtube/oauth/callback',
    )
    expect(loginStateFrom(url)).toBeTruthy()
  })

  it('callback membuat akun baru lalu tiket bisa ditukar jadi sesi', async () => {
    stubGoogle()

    const urlResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/url?next=%2Fapp%2Fmonitor',
    })
    const state = loginStateFrom(urlResponse.json().url)

    const callback = await app.inject({
      method: 'GET',
      url: `/api/v1/content/youtube/oauth/callback?code=valid-code&state=${encodeURIComponent(state)}`,
    })

    expect(callback.statusCode).toBe(302)
    const location = new URL(callback.headers.location as string)
    expect(location.origin).toBe('http://localhost:5173')
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('google')).toBe('success')
    expect(location.searchParams.get('next')).toBe('/app/monitor')
    const ticket = location.searchParams.get('ticket')
    expect(ticket).toBeTruthy()

    const exchange = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google/exchange',
      payload: { ticket },
    })

    expect(exchange.statusCode).toBe(200)
    const body = exchange.json()
    expect(body.user.email).toBe(email)
    expect(body.user.name).toBe('Google Tester')
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${body.accessToken}` },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().user.id).toBe(body.user.id)

    const stored = await prisma.user.findUnique({ where: { email } })
    expect(stored?.googleId).toBe(googleSub)
  })

  it('callback membatalkan login saat user menolak consent', async () => {
    const urlResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/url',
    })
    const state = loginStateFrom(urlResponse.json().url)

    const callback = await app.inject({
      method: 'GET',
      url: `/api/v1/content/youtube/oauth/callback?error=access_denied&error_description=Ditolak&state=${encodeURIComponent(state)}`,
    })

    expect(callback.statusCode).toBe(302)
    const location = new URL(callback.headers.location as string)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('google')).toBe('error')
    expect(location.searchParams.get('reason')).toBe('Ditolak')
  })

  it('menolak tiket palsu', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google/exchange',
      payload: { ticket: 'tiket-palsu-yang-panjangnya-cukup' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('menolak email Google yang belum terverifikasi', async () => {
    await prisma.user.deleteMany({ where: { email } })
    stubGoogle({ verified: false })
    const urlResponse = await app.inject({ method: 'GET', url: '/api/v1/auth/google/url' })
    const state = loginStateFrom(urlResponse.json().url)

    const callback = await app.inject({
      method: 'GET',
      url: `/api/v1/content/youtube/oauth/callback?code=unverified&state=${encodeURIComponent(state)}`,
    })

    expect(callback.statusCode).toBe(302)
    const location = new URL(callback.headers.location as string)
    expect(location.searchParams.get('google')).toBe('error')
    expect(location.searchParams.get('reason')).toContain('belum terverifikasi')
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull()
  })

  it('menautkan akun email yang sudah ada tanpa membuat duplikat', async () => {
    await prisma.user.deleteMany({ where: { email } })
    await prisma.user.create({
      data: {
        name: 'Existing User',
        email,
        passwordHash: 'scrypt$16384$8$1$00$00',
      },
    })
    stubGoogle()

    const urlResponse = await app.inject({ method: 'GET', url: '/api/v1/auth/google/url' })
    const state = loginStateFrom(urlResponse.json().url)
    const callback = await app.inject({
      method: 'GET',
      url: `/api/v1/content/youtube/oauth/callback?code=link-code&state=${encodeURIComponent(state)}`,
    })
    expect(callback.statusCode).toBe(302)

    const stored = await prisma.user.findUnique({ where: { email } })
    expect(stored?.name).toBe('Existing User')
    expect(stored?.googleId).toBe(googleSub)
    expect(await prisma.user.count({ where: { email } })).toBe(1)
  })
})
