import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      include: [/@nexeo-local-observability\/log-parser/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['@nexeo-local-observability/log-parser'],
  },
})
