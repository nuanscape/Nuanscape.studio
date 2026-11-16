import { randomBytes } from 'node:crypto'
import { Prisma, type User } from '@prisma/client'
import { AppError, badRequest, conflict } from '../lib/errors.js'
import { hashPassword } from '../lib/password.js'
import { prisma } from '../lib/prisma.js'
import { exchangeGoogleCode, getGoogleOAuthConfig } from './youtube.js'

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const LOGIN_SCOPES = ['openid', 'email', 'profile'] as const

interface GoogleUserInfo {
  sub?: string
  email?: string
  email_verified?: boolean
  verified_email?: boolean
  name?: string
  given_name?: string
}

export function buildGoogleLoginUrl(state: string): string {
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
    scope: LOGIN_SCOPES.join(' '),
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  })
  return `${OAUTH_AUTH_URL}?${query.toString()}`
}

async function fetchGoogleIdentity(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const data = (await response.json().catch(() => ({}))) as GoogleUserInfo & {
    error_description?: string
  }
  if (!response.ok) {
    throw badRequest(
      'GOOGLE_OAUTH_ERROR',
      `Google menolak permintaan profil: ${data.error_description ?? `HTTP ${response.status}`}`,
    )
  }
  return data
}

async function attachGoogleId(user: User, googleId: string): Promise<User> {
  if (user.googleId && user.googleId !== googleId) {
    throw conflict(
      'GOOGLE_ACCOUNT_CONFLICT',
      'Email ini sudah terhubung dengan akun Google lain.',
    )
  }
  return prisma.user.update({
    where: { id: user.id },
    data: { googleId, lastLoginAt: new Date() },
  })
}

export async function loginWithGoogleCode(code: string): Promise<User> {
  const tokens = await exchangeGoogleCode(code)
  if (!tokens.access_token) {
    throw badRequest('GOOGLE_OAUTH_ERROR', 'Google tidak mengembalikan access token.')
  }

  const identity = await fetchGoogleIdentity(tokens.access_token)
  const email = identity.email?.trim().toLowerCase()
  const verified = identity.email_verified ?? identity.verified_email
  if (!email || verified === false) {
    throw badRequest(
      'GOOGLE_EMAIL_UNVERIFIED',
      'Email Google belum terverifikasi. Verifikasi email lalu coba lagi.',
    )
  }
  if (!identity.sub) {
    throw badRequest('GOOGLE_OAUTH_ERROR', 'Google tidak mengembalikan identitas akun.')
  }

  const googleId = identity.sub
  const existingByGoogle = await prisma.user.findUnique({ where: { googleId } })
  if (existingByGoogle) {
    return prisma.user.update({
      where: { id: existingByGoogle.id },
      data: { lastLoginAt: new Date() },
    })
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } })
  if (existingByEmail) return attachGoogleId(existingByEmail, googleId)

  const name = (identity.name || identity.given_name || email.split('@')[0] || 'Pengguna')
    .trim()
    .slice(0, 80)
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'))

  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        googleId,
        role: 'Owner',
        plan: 'Studio',
        timezone: 'Asia/Jakarta',
        lastLoginAt: new Date(),
        preferences: { create: {} },
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
      })
      if (raced) return attachGoogleId(raced, googleId)
      throw conflict('EMAIL_TAKEN', 'Email sudah terdaftar. Silakan masuk.')
    }
    throw error
  }
}
