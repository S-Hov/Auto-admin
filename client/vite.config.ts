import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // слушать все интерфейсы внутри контейнера
    port: 5173,
    watch: {
      usePolling: true, // стабильный HMR внутри Docker / WSL
    },
  },
})