import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'firebase',
      '@firebase/auth',
      '@firebase/firestore',
      '@firebase/storage'
    ],
    exclude: ['__INDEX__']
  }
})