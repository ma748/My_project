import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0) for mobile/LAN testing
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
