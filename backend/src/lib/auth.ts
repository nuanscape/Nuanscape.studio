import '@fastify/jwt'
import type { FastifyRequest } from 'fastify'
import { unauthorized } from './errors.js'
import { prisma } from './prisma.js'

export interface AuthTokenPayload {
  sub: string
  sid?: string | null
  type: 'access' | 'admin'
  role?: string
}

export interface AuthContext {
  userId: string
  sessionId: string | null
  role: string
  type: 'access' | 'admin'
}

export async function getAuthContext(request: FastifyRequest): Promise<AuthContext> {
  let payload: AuthTokenPayload
  try {
    payload = await request.jwtVerify<AuthTokenPayload>()
  } catch {
    throw unauthorized('Token akses tidak valid atau sudah berakhir.')
  }

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw unauthorized('Token akses tidak valid.')
  }

  if (payload.type === 'admin') {
    const owner = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    })
    if (!owner) throw unauthorized('Akun admin demo tidak ditemukan.')
    return { userId: owner.id, sessionId: null, role: 'Admin', type: 'admin' }
  }

  if (payload.type !== 'access' || !payload.sid) {
    throw unauthorized('Token akses tidak valid.')
  }

  const session = await prisma.authSession.findUnique({
    where: { id: payload.sid },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true },
  })

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw unauthorized('Sesi sudah berakhir. Silakan login lagi.')
  }

  return {
    userId: session.userId,
    sessionId: session.id,
    role: payload.role ?? 'Owner',
    type: 'access',
  }
}

export async function requireAuth(request: FastifyRequest): Promise<AuthContext> {
  return getAuthContext(request)
}

export async function requireAdmin(request: FastifyRequest): Promise<AuthContext> {
  const context = await getAuthContext(request)
  if (context.type !== 'admin' && context.role !== 'Admin') {
    throw unauthorized('Akses admin diperlukan.')
  }
  return context
}
