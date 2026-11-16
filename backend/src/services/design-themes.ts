export const DESIGN_THEME_IDS = ['cinematic', 'pixel', 'anime', 'clay', '3d'] as const

export type DesignThemeId = (typeof DESIGN_THEME_IDS)[number]

export interface DesignTheme {
  id: DesignThemeId
  label: string
  imagePrompt: string
  videoPrompt: string
}

export const DESIGN_THEMES: DesignTheme[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    imagePrompt:
      'cinematic film still, photorealistic, dramatic lighting, shallow depth of field, sharp details, premium production value, premium color grade',
    videoPrompt:
      'preserve the cinematic film grade, lighting, and photoreal detail',
  },
  {
    id: 'pixel',
    label: 'Pixel art',
    imagePrompt:
      '16-bit pixel art, crisp hard pixel edges, limited retro palette, dithering, retro game aesthetic, no anti-aliasing, no photorealism',
    videoPrompt:
      'preserve crisp pixel edges, the retro palette, and pixel-art texture; no smoothing and no added detail',
  },
  {
    id: 'anime',
    label: 'Anime',
    imagePrompt:
      'anime key visual, cel-shaded illustration, clean line art, vivid colors, detailed anime background, no photorealism',
    videoPrompt:
      'preserve cel-shaded line art, flat colors, and the anime illustration style; no photoreal conversion',
  },
  {
    id: 'clay',
    label: 'Clay',
    imagePrompt:
      'handmade claymation still, soft plasticine texture, sculpted clay forms, miniature stop-motion set, warm studio lighting, no photorealism',
    videoPrompt:
      'preserve the clay texture, sculpted forms, and miniature stop-motion set look',
  },
  {
    id: '3d',
    label: '3D render',
    imagePrompt:
      'high-end 3D render, stylized CGI, soft global illumination, clean geometry, subtle depth of field, no photorealism',
    videoPrompt:
      'preserve the 3D materials, geometry, and soft global illumination',
  },
]

export function getDesignTheme(id?: string): DesignTheme {
  return DESIGN_THEMES.find((theme) => theme.id === id) ?? DESIGN_THEMES[0]!
}
