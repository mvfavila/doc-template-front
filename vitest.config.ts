import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    server: {
      deps: {
        inline: [
          '@vue',
          'firebase',
          '@firebase/auth'
        ]
      }
    }
  }
})