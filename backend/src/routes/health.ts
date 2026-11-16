import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const livenessResponse = z.object({
  status: z.literal('ok'),
  service: z.literal('nuanscape-api'),
  uptime: z.number(),
  timestamp: z.string(),
})

const readinessResponse = z.object({
  status: z.enum(['ok', 'unavailable']),
  database: z.enum(['up', 'down']),
  timestamp: z.string(),
})

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness check',
        response: { 200: livenessResponse },
      },
    },
    async () => ({
      status: 'ok' as const,
      service: 'nuanscape-api' as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  )

  app.get(
    '/ready',
    {
      schema: {
        tags: ['system'],
        summary: 'Readiness check (database)',
        response: { 200: readinessResponse, 503: readinessResponse },
      },
    },
    async (_request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return {
          status: 'ok' as const,
          database: 'up' as const,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        app.log.error({ err: error }, 'database readiness check failed')
        return reply.status(503).send({
          status: 'unavailable' as const,
          database: 'down' as const,
          timestamp: new Date().toISOString(),
        })
      }
    },
  )
}
