import type { FastifyRequest } from 'fastify'
import { getAuthContext } from './auth.js'
import { unauthorized } from './errors.js'
import { prisma } from './prisma.js'

let cachedDemoOwnerId: string | undefined

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Owner demo dipakai PIN Admin dan fallback development.
 * Sesi akun normal memakai JWT (Authorization: Bearer ...).
 */
export async function ensureDemoOwner(): Promise<{ id: string }> {
  if (cachedDemoOwnerId) return { id: cachedDemoOwnerId }

  const email = process.env.DEMO_OWNER_EMAIL ?? 'demo@nuanscape.studio'
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Demo Owner',
      passwordHash: 'DEMO_NO_LOGIN',
      role: 'Owner',
      plan: 'Studio',
      preferences: { create: {} },
    },
    select: { id: true },
  })

  cachedDemoOwnerId = user.id
  return { id: user.id }
}

export async function resolveOwnerId(request: FastifyRequest): Promise<string> {
  const authorization = request.headers.authorization
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    const context = await getAuthContext(request)
    return context.userId
  }

  if (isProduction()) {
    throw unauthorized('Sesi diperlukan. Kirim header Authorization: Bearer <token>.')
  }

  const header = request.headers['x-owner-id']
  if (typeof header === 'string' && header.trim()) {
    const owner = await prisma.user.findUnique({
      where: { id: header.trim() },
      select: { id: true },
    })
    if (!owner) throw unauthorized('Owner tidak ditemukan.')
    return owner.id
  }

  const demo = await ensureDemoOwner()
  return demo.id
}
