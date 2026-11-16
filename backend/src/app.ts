import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'
import { loadConfig, type AppConfig } from './config.js'
import { AppError } from './lib/errors.js'
import { authRoutes } from './routes/auth.js'
import { contentRoutes } from './routes/content.js'
import { financeRoutes } from './routes/finance.js'
import { healthRoutes } from './routes/health.js'
import { mediaRoutes } from './routes/media.js'
import { monitorRoutes } from './routes/monitor.js'
import { providerRoutes } from './routes/providers.js'
import { sellerRoutes } from './routes/seller.js'

export interface BuildAppOptions {
  config?: AppConfig
  logger?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig()

  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: config.logLevel,
            ...(config.nodeEnv === 'development'
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
                  },
                }
              : {}),
          },
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  })

  await app.register(jwt, { secret: config.jwtSecret })

  // Security Headers
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '0')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (config.nodeEnv === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
  })

  // In-memory rate limiting untuk endpoint sensitif (login & register)
  const authRateMap = new Map<string, { count: number; resetAt: number }>()
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url
    if (path.startsWith('/api/v1/auth/login') || path.startsWith('/api/v1/auth/register')) {
      const ip = request.ip || '127.0.0.1'
      const now = Date.now()
      const record = authRateMap.get(ip)
      if (!record || now > record.resetAt) {
        authRateMap.set(ip, { count: 1, resetAt: now + 60_000 })
      } else {
        record.count++
        if (record.count > 60) {
          reply.header('Retry-After', Math.ceil((record.resetAt - now) / 1000))
          return reply.status(429).send({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Terlalu banyak percobaan autentikasi. Silakan tunggu 1 menit.',
            },
          })
        }
      }
    }
  })

  if (config.swaggerEnabled) {
    await app.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'Nuanscape.studio API',
          version: '0.1.0',
          description:
            'Kontrak API backend Nuanscape.studio. Sumber kebenaran: PRD.md dan src/types/index.ts.',
        },
        servers: [{ url: '/api/v1' }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
      transform: jsonSchemaTransform,
    })

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    })
  }

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Rute ${request.method} ${request.url} tidak ditemukan.`,
      },
    })
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn({ err: error }, 'zod validation error')
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data permintaan tidak valid.',
          details: error.issues,
        },
      })
      return
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error(
          { code: error.code, message: error.message },
          'request failed',
        )
      }
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      })
      return
    }

    const fastifyError = error as { validation?: unknown; statusCode?: number }

    if (fastifyError.validation) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data permintaan tidak valid.',
          details: fastifyError.validation,
        },
      })
      return
    }

    request.log.error({ err: error }, 'unhandled error')
    const statusCode =
      fastifyError.statusCode && fastifyError.statusCode < 500 ? fastifyError.statusCode : 500
    reply.status(statusCode).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal.',
      },
    })
  })

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(mediaRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes(config), { prefix: '/api/v1' })
  await app.register(contentRoutes, { prefix: '/api/v1' })
  await app.register(financeRoutes, { prefix: '/api/v1' })
  await app.register(sellerRoutes, { prefix: '/api/v1' })
  await app.register(monitorRoutes, { prefix: '/api/v1' })
  await app.register(providerRoutes, { prefix: '/api/v1' })

  return app
}
