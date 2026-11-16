import { describe, expect, it } from 'vitest'
import { DESIGN_THEMES, getDesignTheme } from '../src/services/design-themes.js'
import { buildImagePrompt } from '../src/services/media-generator.js'
import { buildAiVideoPrompt } from '../src/services/media-renderer.js'

describe('design themes', () => {
  it('menyediakan tema cinematic, pixel, anime, clay, dan 3d', () => {
    expect(DESIGN_THEMES.map((theme) => theme.id)).toEqual([
      'cinematic',
      'pixel',
      'anime',
      'clay',
      '3d',
    ])
  })

  it('memakai cinematic sebagai fallback untuk id yang tidak dikenal', () => {
    expect(getDesignTheme('tidak-ada').id).toBe('cinematic')
  })

  it.each([
    ['pixel', '16-bit pixel art', 'no anti-aliasing'],
    ['anime', 'anime key visual', 'cel-shaded illustration'],
    ['clay', 'handmade claymation still', 'plasticine texture'],
    ['3d', 'high-end 3D render', 'global illumination'],
  ])('memasukkan gaya %s ke prompt gambar tanpa fotorealisme', (theme, marker, detail) => {
    const prompt = buildImagePrompt({
      contentType: 'music',
      title: 'Lofi Senja',
      thumbnailStyle: 'vinyl',
      musicStyle: 'Lofi',
      designTheme: theme,
      format: 'long',
    })

    expect(prompt).toContain(marker)
    expect(prompt).toContain(detail)
    expect(prompt).toContain('no photorealism')
  })

  it('mempertahankan fotorealisme hanya untuk tema cinematic', () => {
    const prompt = buildImagePrompt({
      contentType: 'music',
      title: 'Lofi Senja',
      thumbnailStyle: 'vinyl',
      musicStyle: 'Lofi',
      designTheme: 'cinematic',
      format: 'long',
    })

    expect(prompt).toContain('photorealistic')
    expect(prompt).not.toContain('no photorealism')
  })

  it('meneruskan tema ke prompt animasi AI', () => {
    const prompt = buildAiVideoPrompt({
      musicStyle: 'lofi',
      designTheme: 'pixel',
    } as Parameters<typeof buildAiVideoPrompt>[0])

    expect(prompt).toContain('Maintain the exact Pixel art look')
    expect(prompt).toContain('crisp pixel edges')
    expect(prompt).not.toContain('Cinematic static shot')
  })
})
