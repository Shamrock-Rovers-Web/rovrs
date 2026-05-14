import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = __dirname

export default defineConfig({
  plugins: [react()],
  root: adminRoot,
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.join(adminRoot, 'tailwind.config.js') }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'js',
  },
})
