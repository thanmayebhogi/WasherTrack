import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Dev only: browser requests go to /api on the same origin, and Vite forwards
  // them to the backend. The deployed build never uses this — it calls
  // VITE_API_URL directly (see src/api.js).
  const apiTarget = env.VITE_API_URL || 'http://localhost:4000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
