import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5174, // Changed from 3000 to avoid Grafana conflict
    host: 'localhost',
    strictPort: false // Try next available port if 5174 is taken
  }
})

