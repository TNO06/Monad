import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './', // Ensures all assets use relative paths (fixes GitHub Pages 404)
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Exposes the server on your local network
    allowedHosts: true, // Allows all hosts (fixes tunnel blocked request)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})