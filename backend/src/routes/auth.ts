import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Prisma, type User, type UserPreference } from '@prisma/client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AppConfig } from '../config.js'
import { requireAuth, type AuthTokenPayload } from '../lib/auth.js'
import { AppError, badRequest, conflict, notFound, unauthorized } from '../lib/errors.js'
import { ensureDemoOwner } from '../lib/owner.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { prisma } from '../lib/prisma.js'
import { buildGoogleLoginUrl } from '../services/google-auth.js'

const ADMIN_TOKEN_TTL = 7_200
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const
const AI_TONES = [
  'Ringkas dan langsung',
  'Detail dengan alasan',
  'Santai dan kolaboratif',
] as const

const registerBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE),
  password: z.string().min(6).max(200),
})

const loginBody = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE),
  password: z.string().min(1).max(200),
})

const googleUrlQuery = z.object({
  next: z.string().trim().max(300).optional(),
})

const googleExchangeBody = z.object({
  ticket: z.string().min(20).max(2_000),
})

const refreshBody = z.object({ refreshToken: z.string().min(20).max(500) })

const adminBody = z.object({ pin: z.string().trim().min(4).max(8) })

const updateProfileBody = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE).optional(),
  role: z.string().trim().min(2).max(60).optional(),
  timezone: z.enum(TIMEZONES).optional(),
})

const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
})

const notificationsPatch = z
  .object({
    daily: z.boolean().optional(),
    stock: z.boolean().optional(),
    budget: z.boolean().optional(),
    content: z.boolean().optional(),
    email: z.boolean().optional(),
  })
  .optional()

const aiPatch = z
  .object({
    tone: z.enum(AI_TONES).optional(),
    citations: z.boolean().optional(),
    estimates: z.boolean().optional(),
    approval: z.boolean().optional(),
  })
  .optional()

const updatePreferencesBody = z.object({
  currency: z.enum(['IDR', 'USD']).optional(),
  language: z.enum(['Bahasa Indonesia', 'English']).optional(),
  weekStart: z.enum(['Senin', 'Minggu']).optional(),
  compact: z.boolean().optional(),
  notifications: notificationsPatch,
  ai: aiPatch,
})

const sessionParams = z.object({ id: z.string().min(1) })

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function mapUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: initialsOf(user.name),
    plan: user.plan,
    timezone: user.timezone,
    joinedAt: user.createdAt.toISOString(),
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt.toISOString() } : {}),
  }
}

function mapPreferences(preference: UserPreference) {
  return {
    currency: preference.currency,
    language: preference.language,
    weekStart: preference.weekStart,
    compact: preference.compact,
    notifications: {
      daily: preference.notifyDaily,
      stock: preference.notifyStock,
      budget: preference.notifyBudget,
      content: preference.notifyContent,
      email: preference.notifyEmail,
    },
    ai: {
      tone: preference.aiTone,
      citations: preference.aiCitations,
      estimates: preference.aiEstimates,
      approval: preference.aiApproval,
    },
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url')
}

function refreshExpiry(config: AppConfig): Date {
  return new Date(Date.now() + config.jwtRefreshTtl * 1000)
}

function requestMeta(request: FastifyRequest) {
  return {
    userAgent: request.headers['user-agent']?.slice(0, 255) ?? null,
    ip: request.ip.slice(0, 64),
  }
}

function safeEqual(left: string, right: string): boolean {
  const a = createHash('sha256').update(left).digest()
  const b = createHash('sha256').update(right).digest()
  return timingSafeEqual(a, b)
}

function invalidCredentials(): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah.')
}

function invalidRefreshToken(): AppError {
  return new AppError(
    401,
    'INVALID_REFRESH_TOKEN',
    'Refresh token tidak valid atau sudah berakhir.',
  )
}

function safeNextPath(value: string | undefined): string {
  if (!value) return '/app'
  if (!value.startsWith('/') || value.startsWith('//')) return '/app'
  return value
}

function signAccessToken(
  app: { jwt: { sign: (payload: AuthTokenPayload, options?: { expiresIn?: number }) => string } },
  config: AppConfig,
  userId: string,
  sessionId: string | null,
  role: string,
  type: 'access' | 'admin' = 'access',
): string {
  return app.jwt.sign(
    { sub: userId, sid: sessionId, type, role },
    { expiresIn: type === 'admin' ? ADMIN_TOKEN_TTL : config.jwtAccessTtl },
  )
}

function tokenResponse(
  app: { jwt: { sign: (payload: AuthTokenPayload, options?: { expiresIn?: number }) => string } },
  config: AppConfig,
  user: User,
  sessionId: string,
  refreshToken: string,
  accessTtl: number = config.jwtAccessTtl,
) {
  return {
    user: mapUser(user),
    accessToken: signAccessToken(app, config, user.id, sessionId, user.role),
    refreshToken,
    tokenType: 'Bearer' as const,
    expiresIn: accessTtl,
    refreshExpiresIn: config.jwtRefreshTtl,
  }
}

async function createSession(
  userId: string,
  refreshToken: string,
  meta: { userAgent: string | null; ip: string | null },
  config: AppConfig,
) {
  return prisma.authSession.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshExpiry(config),
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
  })
}

async function ensurePreferences(userId: string): Promise<UserPreference> {
  return prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

function preferenceUpdateData(input: z.infer<typeof updatePreferencesBody>) {
  const data: Prisma.UserPreferenceUncheckedUpdateInput = {}
  if (input.currency !== undefined) data.currency = input.currency
  if (input.language !== undefined) data.language = input.language
  if (input.weekStart !== undefined) data.weekStart = input.weekStart
  if (input.compact !== undefined) data.compact = input.compact

  if (input.notifications) {
    const notifications = input.notifications
    if (notifications.daily !== undefined) data.notifyDaily = notifications.daily
    if (notifications.stock !== undefined) data.notifyStock = notifications.stock
    if (notifications.budget !== undefined) data.notifyBudget = notifications.budget
    if (notifications.content !== undefined) data.notifyContent = notifications.content
    if (notifications.email !== undefined) data.notifyEmail = notifications.email
  }

  if (input.ai) {
    const ai = input.ai
    if (ai.tone !== undefined) data.aiTone = ai.tone
    if (ai.citations !== undefined) data.aiCitations = ai.citations
    if (ai.estimates !== undefined) data.aiEstimates = ai.estimates
    if (ai.approval !== undefined) data.aiApproval = ai.approval
  }

  return data
}

export function authRoutes(config: AppConfig): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/auth/register',
      {
        schema: {
          tags: ['auth'],
          summary: 'Daftar akun studio',
          body: registerBody,
        },
      },
      async (request, reply) => {
        const { name, email, password } = request.body
        const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
        if (exists) throw conflict('EMAIL_TAKEN', 'Email sudah terdaftar. Silakan masuk.')

        const passwordHash = await hashPassword(password)
        let user: User

        try {
          user = await prisma.user.create({
            data: {
              name,
              email,
              passwordHash,
              role: 'Owner',
              plan: 'Studio',
              timezone: 'Asia/Jakarta',
              lastLoginAt: new Date(),
              preferences: { create: {} },
            },
          })
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw conflict('EMAIL_TAKEN', 'Email sudah terdaftar. Silakan masuk.')
          }
          throw error
        }

        const refreshToken = generateRefreshToken()
        const session = await createSession(user.id, refreshToken, requestMeta(request), config)

        return reply
          .status(201)
          .send(tokenResponse(app, config, user, session.id, refreshToken))
      },
    )

    app.post(
      '/auth/login',
      {
        schema: {
          tags: ['auth'],
          summary: 'Masuk dengan email dan password',
          body: loginBody,
        },
      },
      async (request) => {
        const { email, password } = request.body
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) throw invalidCredentials()

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) throw invalidCredentials()

        const refreshToken = generateRefreshToken()
        const session = await createSession(user.id, refreshToken, requestMeta(request), config)
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return tokenResponse(app, config, updated, session.id, refreshToken)
      },
    )

    app.get(
      '/auth/google/url',
      {
        schema: {
          tags: ['auth'],
          summary: 'URL consent Google untuk masuk atau mendaftar',
          querystring: googleUrlQuery,
        },
      },
      async (request) => {
        const next = safeNextPath(request.query.next)
        const state = app.jwt.sign({ typ: 'google_login', next }, { expiresIn: 600 })
        return { url: buildGoogleLoginUrl(state) }
      },
    )

    app.post(
      '/auth/google/exchange',
      {
        schema: {
          tags: ['auth'],
          summary: 'Tukar tiket callback Google menjadi sesi login',
          body: googleExchangeBody,
        },
      },
      async (request) => {
        let payload: { sub?: string; type?: string }
        try {
          payload = app.jwt.verify(request.body.ticket)
        } catch {
          throw unauthorized('Tiket login Google tidak valid atau sudah berakhir.')
        }
        if (payload.type !== 'google_ticket' || !payload.sub) {
          throw unauthorized('Tiket login Google tidak valid.')
        }

        const user = await prisma.user.findUnique({ where: { id: payload.sub } })
        if (!user) throw unauthorized('Akun tidak ditemukan.')

        const refreshToken = generateRefreshToken()
        const session = await createSession(user.id, refreshToken, requestMeta(request), config)
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        return tokenResponse(app, config, updated, session.id, refreshToken)
      },
    )

    app.post(
      '/auth/refresh',
      {
        schema: {
          tags: ['auth'],
          summary: 'Tukar refresh token menjadi access token baru',
          body: refreshBody,
        },
      },
      async (request) => {
        const tokenHash = sha256(request.body.refreshToken)
        const session = await prisma.authSession.findUnique({
          where: { tokenHash },
          include: { user: true },
        })

        if (
          !session ||
          session.revokedAt !== null ||
          session.expiresAt.getTime() <= Date.now()
        ) {
          throw invalidRefreshToken()
        }

        const nextToken = generateRefreshToken()
        const meta = requestMeta(request)
        await prisma.authSession.update({
          where: { id: session.id },
          data: {
            tokenHash: sha256(nextToken),
            expiresAt: refreshExpiry(config),
            lastUsedAt: new Date(),
            userAgent: meta.userAgent,
            ip: meta.ip,
          },
        })

        return tokenResponse(
          app,
          config,
          session.user,
          session.id,
          nextToken,
        )
      },
    )

    app.post(
      '/auth/logout',
      { schema: { tags: ['auth'], summary: 'Cabut sesi saat ini', security: [{ bearerAuth: [] }] } },
      async (request) => {
        const context = await requireAuth(request)
        if (context.sessionId) {
          await prisma.authSession.updateMany({
            where: { id: context.sessionId, userId: context.userId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
        }
        return { ok: true }
      },
    )

    app.get(
      '/auth/me',
      { schema: { tags: ['auth'], summary: 'Profil dan preferensi user aktif', security: [{ bearerAuth: [] }] } },
      async (request) => {
        const context = await requireAuth(request)
        const user = await prisma.user.findUnique({ where: { id: context.userId } })
        if (!user) throw unauthorized('Akun tidak ditemukan.')
        const preferences = await ensurePreferences(user.id)
        return { user: mapUser(user), preferences: mapPreferences(preferences) }
      },
    )

    app.patch(
      '/auth/me',
      {
        schema: {
          tags: ['auth'],
          summary: 'Ubah profil user aktif',
          body: updateProfileBody,
          security: [{ bearerAuth: [] }],
        },
      },
      async (request) => {
        const context = await requireAuth(request)
        const current = await prisma.user.findUnique({ where: { id: context.userId } })
        if (!current) throw unauthorized('Akun tidak ditemukan.')

        const input = request.body
        if (input.email && input.email !== current.email) {
          const duplicate = await prisma.user.findUnique({
            where: { email: input.email },
            select: { id: true },
          })
          if (duplicate) throw conflict('EMAIL_TAKEN', 'Email sudah dipakai akun lain.')
        }

        const data: Prisma.UserUpdateInput = {}
        if (input.name !== undefined) data.name = input.name
        if (input.email !== undefined) data.email = input.email
        if (input.role !== undefined) data.role = input.role
        if (input.timezone !== undefined) data.timezone = input.timezone

        const user = await prisma.user.update({ where: { id: current.id }, data })
        return { user: mapUser(user) }
      },
    )

    app.post(
      '/auth/change-password',
      {
        schema: {
          tags: ['auth'],
          summary: 'Ganti password dan cabut sesi lain',
          body: changePasswordBody,
          security: [{ bearerAuth: [] }],
        },
      },
      async (request) => {
        const context = await requireAuth(request)
        if (context.type === 'admin') {
          throw badRequest('ADMIN_SESSION', 'Sesi admin tidak memiliki password.')
        }

        const user = await prisma.user.findUnique({ where: { id: context.userId } })
        if (!user) throw unauthorized('Akun tidak ditemukan.')

        const valid = await verifyPassword(request.body.currentPassword, user.passwordHash)
        if (!valid) throw invalidCredentials()

        if (request.body.currentPassword === request.body.newPassword) {
          throw badRequest('PASSWORD_UNCHANGED', 'Password baru harus berbeda dari password lama.')
        }

        const passwordHash = await hashPassword(request.body.newPassword)
        const [updated, revoked] = await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
          prisma.authSession.updateMany({
            where: {
              userId: user.id,
              revokedAt: null,
              ...(context.sessionId ? { id: { not: context.sessionId } } : {}),
            },
            data: { revokedAt: new Date() },
          }),
        ])

        return {
          ok: true,
          revokedSessions: revoked.count,
          user: mapUser(updated),
        }
      },
    )

    app.get(
      '/auth/preferences',
      { schema: { tags: ['auth'], summary: 'Preferensi workspace, notifikasi, dan AI', security: [{ bearerAuth: [] }] } },
      async (request) => {
        const context = await requireAuth(request)
        const preferences = await ensurePreferences(context.userId)
        return { preferences: mapPreferences(preferences) }
      },
    )

    app.patch(
      '/auth/preferences',
      {
        schema: {
          tags: ['auth'],
          summary: 'Ubah preferensi user aktif',
          body: updatePreferencesBody,
          security: [{ bearerAuth: [] }],
        },
      },
      async (request) => {
        const context = await requireAuth(request)
        await ensurePreferences(context.userId)
        const preferences = await prisma.userPreference.update({
          where: { userId: context.userId },
          data: preferenceUpdateData(request.body),
        })
        return { preferences: mapPreferences(preferences) }
      },
    )

    app.get(
      '/auth/sessions',
      { schema: { tags: ['auth'], summary: 'Daftar sesi aktif', security: [{ bearerAuth: [] }] } },
      async (request) => {
        const context = await requireAuth(request)
        const sessions = await prisma.authSession.findMany({
          where: {
            userId: context.userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { lastUsedAt: 'desc' },
        })

        return {
          sessions: sessions.map((session) => ({
            id: session.id,
            userAgent: session.userAgent,
            ip: session.ip,
            createdAt: session.createdAt.toISOString(),
            lastUsedAt: session.lastUsedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            current: session.id === context.sessionId,
          })),
        }
      },
    )

    app.delete(
      '/auth/sessions/:id',
      {
        schema: {
          tags: ['auth'],
          summary: 'Cabut satu sesi milik user aktif',
          params: sessionParams,
          security: [{ bearerAuth: [] }],
        },
      },
      async (request) => {
        const context = await requireAuth(request)
        if (context.sessionId === request.params.id) {
          throw badRequest('CURRENT_SESSION', 'Gunakan logout untuk sesi yang sedang aktif.')
        }

        const result = await prisma.authSession.updateMany({
          where: {
            id: request.params.id,
            userId: context.userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        })

        if (result.count === 0) throw notFound('Sesi tidak ditemukan.')
        return { ok: true }
      },
    )

    app.post(
      '/auth/admin',
      {
        schema: {
          tags: ['auth'],
          summary: 'Masuk cepat dengan PIN admin demo',
          body: adminBody,
        },
      },
      async (request) => {
        if (!config.demoAdminPin) {
          throw new AppError(403, 'ADMIN_DISABLED', 'Login PIN admin tidak diaktifkan.')
        }

        if (!safeEqual(request.body.pin, config.demoAdminPin)) {
          throw new AppError(401, 'INVALID_ADMIN_PIN', 'PIN admin tidak valid.')
        }

        const owner = await ensureDemoOwner()
        const user = await prisma.user.findUnique({ where: { id: owner.id } })
        if (!user) throw unauthorized('Akun demo tidak ditemukan.')

        return {
          user: mapUser(user),
          admin: true,
          accessToken: signAccessToken(
            app,
            config,
            user.id,
            null,
            'Admin',
            'admin',
          ),
          tokenType: 'Bearer' as const,
          expiresIn: ADMIN_TOKEN_TTL,
        }
      },
    )
  }
}
