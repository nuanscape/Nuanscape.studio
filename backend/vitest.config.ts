import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      MUSIC_PROVIDER: 'procedural',
      TTS_PROVIDER: 'edge',
      IMAGE_PROVIDER: 'none',
      YOUTUBE_RESEARCH_ENABLED: 'false',
    },
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
})
