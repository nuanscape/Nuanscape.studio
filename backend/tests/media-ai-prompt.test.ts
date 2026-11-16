import { describe, expect, it } from 'vitest'
import { buildAiVideoPrompt } from '../src/services/media-renderer.js'

describe('buildAiVideoPrompt cinematic static', () => {
  const prompt = buildAiVideoPrompt({
    musicStyle: 'lofi',
  } as Parameters<typeof buildAiVideoPrompt>[0])

  it('meminta kamera statis dan gerakan minimal', () => {
    expect(prompt).toContain('Cinematic static shot')
    expect(prompt).toContain('Locked-off camera')
    expect(prompt).toContain('no camera movement')
    expect(prompt).toContain('near-static living picture')
  })

  it('tidak lagi meminta push-in atau parallax drift', () => {
    expect(prompt).not.toContain('push-in')
    expect(prompt).not.toContain('parallax drift')
    expect(prompt).not.toContain('floating dust motes')
  })

  it('tetap melarang teks dan watermark', () => {
    expect(prompt).toContain('no text')
    expect(prompt).toContain('no logos')
    expect(prompt).toContain('no watermark')
  })
})
