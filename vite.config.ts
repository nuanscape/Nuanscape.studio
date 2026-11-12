import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('framer-motion') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion'
          if (id.includes('react-router')) return 'router'
          if (id.includes('@tanstack')) return 'tanstack'
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) return 'forms'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
