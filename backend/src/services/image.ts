import { synthesizeGptImage, type ImageAspectRatio } from './gpt-image.js'

export type ImageProvider = 'gpt-image-2' | 'none'

export function imageProvider(): ImageProvider {
  const raw = process.env.IMAGE_PROVIDER?.trim().toLowerCase()
  return raw === 'gpt-image-2' ? 'gpt-image-2' : 'none'
}

export async function generateContentImage(
  prompt: string,
  out: string,
  aspectRatio: ImageAspectRatio,
  apiKey?: string,
): Promise<ImageProvider> {
  if (imageProvider() === 'none') return 'none'
  await synthesizeGptImage(prompt, out, aspectRatio, apiKey)
  return 'gpt-image-2'
}
