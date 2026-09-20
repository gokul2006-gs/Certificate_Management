import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT || 5173),
    },
    build: {
      minify: true,   // Vite 8 default: oxc (faster than esbuild)
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // manualChunks as a function (required by Vite 8 / rolldown)
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) {
              return 'router-vendor';
            }
            if (id.includes('node_modules/axios')) {
              return 'axios-vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'lucide-vendor';
            }
          },
        },
      },
    },
  }
})