import 'dotenv/config'
import path from 'node:path'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8790),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://nuanscape:nuanscape@localhost:5434/nuanscape?schema=public'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
  DEMO_ADMIN_PIN: z.string().min(4).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  AGENT_RUNTIME: z.enum(['deterministic', 'picoclaw']).default('deterministic'),
  PICOCLAW_BIN: z.string().min(1).default('./agents/picoclaw/bin/picoclaw'),
  PICOCLAW_CONFIG: z.string().min(1).default('./agents/picoclaw/config.json'),
  PICOCLAW_HOME: z.string().min(1).default('./agents/picoclaw/.runtime'),
  PICOCLAW_WORKDIR: z.string().min(1).default('./agents/picoclaw'),
  PICOCLAW_MODEL: z.string().min(1).optional(),
  PICOCLAW_TIMEOUT_MS: z.coerce.number().int().positive().default(240_000),
})

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production'
  host: string
  port: number
  databaseUrl: string
  corsOrigins: string[]
  logLevel: string
  swaggerEnabled: boolean
  demoAdminPin?: string
  jwtSecret: string
  jwtAccessTtl: number
  jwtRefreshTtl: number
  agentRuntime: 'deterministic' | 'picoclaw'
  picoclawBin: string
  picoclawConfig: string
  picoclawHome: string
  picoclawWorkDir: string
  picoclawModel?: string
  picoclawTimeoutMs: number
}

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me-32chars'

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Konfigurasi environment tidak valid: ${detail}`)
  }

  const env = parsed.data
  const jwtSecret = env.JWT_SECRET ?? (env.NODE_ENV === 'production' ? '' : DEV_JWT_SECRET)
  if (jwtSecret.length < 32) {
    throw new Error('Konfigurasi environment tidak valid: JWT_SECRET wajib diisi minimal 32 karakter.')
  }

  return {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: env.LOG_LEVEL,
    swaggerEnabled: env.SWAGGER_ENABLED === 'true',
    ...(env.DEMO_ADMIN_PIN ? { demoAdminPin: env.DEMO_ADMIN_PIN } : {}),
    jwtSecret,
    jwtAccessTtl: env.JWT_ACCESS_TTL,
    jwtRefreshTtl: env.JWT_REFRESH_TTL,
    agentRuntime: env.AGENT_RUNTIME,
    picoclawBin: env.PICOCLAW_BIN.includes('/')
      ? path.resolve(env.PICOCLAW_BIN)
      : env.PICOCLAW_BIN,
    picoclawConfig: path.resolve(env.PICOCLAW_CONFIG),
    picoclawHome: path.resolve(env.PICOCLAW_HOME),
    picoclawWorkDir: path.resolve(env.PICOCLAW_WORKDIR),
    ...(env.PICOCLAW_MODEL ? { picoclawModel: env.PICOCLAW_MODEL } : {}),
    picoclawTimeoutMs: env.PICOCLAW_TIMEOUT_MS,
  }
}
