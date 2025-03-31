import { defineConfig } from 'cypress'
import viteConfig from './vite.config.js'

export default defineConfig({
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
      viteConfig: {
        ...viteConfig,
        server: {
          middlewareMode: false
        }
      }
    },
    indexHtmlFile: 'cypress/support/component-index.html',
    supportFile: 'cypress/support/component.js',
    specPattern: 'tests/component/**/*.spec.{js,jsx,ts,tsx}'
  }
})