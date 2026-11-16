import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderContentVideo } from '../src/services/media-renderer.js'

const posterSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#101010"/></svg>'

function musicInput() {
  return {
    title: 'Test Lofi',
    contentType: 'music' as const,
    platform: 'YouTube' as const,
    format: 'long' as const,
    posterSvg,
    thumbnailStyle: 'minimal',
    musicStyle: 'lofi',
    imageProvider: 'gpt-image-2' as const,
    imageCount: 1,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('renderContentVideo AI wajib untuk musik', () => {
  it('menolak render musik jika AI_VIDEO_PROVIDER bukan kie', async () => {
    vi.stubEnv('AI_VIDEO_PROVIDER', 'none')
    await expect(renderContentVideo(musicInput())).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_VIDEO_NOT_CONFIGURED',
    })
  })

  it('menolak render musik jika gambar GPT Image 2 tidak tersedia', async () => {
    vi.stubEnv('AI_VIDEO_PROVIDER', 'kie')
    await expect(
      renderContentVideo({ ...musicInput(), imageProvider: 'none', imageCount: 0 }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_VIDEO_IMAGE_REQUIRED',
    })
  })
})
