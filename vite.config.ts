import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separar libs pesadas em chunks próprios
          if (id.includes('jspdf')) return 'vendor-pdf'
          if (id.includes('html2canvas')) return 'vendor-pdf'
          if (id.includes('date-fns')) return 'vendor-date'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/react-router')) return 'vendor-react'
        },
      },
    },
    // Limitar tamanho de chunk para melhor caching
    chunkSizeWarningLimit: 500,
  },
  server: {
    host: true,
    // Headers de segurança para dev
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },
})
