import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MEDIA_STORAGE_DIR } from '../services/media-renderer.js'

const FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(mp4|png)$/
const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.png': 'image/png',
}

const fileParams = z.object({ file: z.string().min(1) })

export async function mediaRoutes(app: FastifyInstance) {
  app.get(
    '/media/:file',
    {
      schema: {
        tags: ['media'],
        summary: 'Menyajikan file media hasil render',
        params: fileParams,
      },
    },
    async (request, reply) => {
      const file = (request.params as { file: string }).file
      if (!FILE_PATTERN.test(file)) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Media tidak ditemukan.' },
        })
      }

      const filePath = path.join(MEDIA_STORAGE_DIR, file)
      let info
      try {
        info = await stat(filePath)
      } catch {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Media tidak ditemukan.' },
        })
      }

      const contentType = MIME_TYPES[path.extname(file)] ?? 'application/octet-stream'
      const range = request.headers.range
      reply.header('Cache-Control', 'public, max-age=86400')
      reply.header('Accept-Ranges', 'bytes')
      reply.type(contentType)

      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range)
        if (match) {
          const start = match[1] ? Number.parseInt(match[1], 10) : 0
          const end = match[2] ? Number.parseInt(match[2], 10) : info.size - 1
          if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < info.size) {
            const safeEnd = Math.min(end, info.size - 1)
            reply.status(206)
            reply.header('Content-Range', `bytes ${start}-${safeEnd}/${info.size}`)
            reply.header('Content-Length', safeEnd - start + 1)
            return reply.send(createReadStream(filePath, { start, end: safeEnd }))
          }
        }
      }

      reply.header('Content-Length', info.size)
      return reply.send(createReadStream(filePath))
    },
  )
}
