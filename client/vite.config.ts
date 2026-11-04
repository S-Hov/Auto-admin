import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Linked workspace packages are served as source by default. Our contracts
    // are CommonJS, so convert every public entry point to ESM for the browser.
    include: [
      '@auto-admin/contracts/common',
      '@auto-admin/contracts/auth',
      '@auto-admin/contracts/bootstrap',
      '@auto-admin/contracts/database',
      '@auto-admin/contracts/install',
      '@auto-admin/contracts/menu',
      '@auto-admin/contracts/pages',
      '@auto-admin/contracts/access-control',
      '@auto-admin/contracts/query',
    ],
  },
  server: {
    host: '0.0.0.0', // слушать все интерфейсы внутри контейнера
    port: 5173,
    watch: {
      usePolling: true, // стабильный HMR внутри Docker / WSL
    },
  },
})
