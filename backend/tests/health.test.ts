import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

afterAll(async () => {
  await app.close()
})

describe('system routes', () => {
  it('GET /api/v1/health mengembalikan liveness', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'nuanscape-api',
    })
  })

  it('rute tidak dikenal memakai format error standar', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/tidak-ada' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Rute GET /api/v1/tidak-ada tidak ditemukan.',
      },
    })
  })
})
