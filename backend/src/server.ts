import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { prisma } from './lib/prisma.js'

const config = loadConfig()
const app = await buildApp({ config })

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  app.log.info({ signal }, 'mematikan server')
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error({ err: error }, 'gagal menjalankan server')
  await prisma.$disconnect()
  process.exit(1)
}
