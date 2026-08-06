import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // js/css/html for the app shell, mp3 for cinematic-tour narration,
        // json/txt for the small catalog/TLE snapshot files under
        // public/data. Textures (jpg/webp/png) are deliberately excluded —
        // see Task 5 for why they're runtime-cached instead of precached.
        globPatterns: ['**/*.{js,css,html,mp3,json,txt}'],
        // vite-plugin-pwa's default precache limit is 2 MiB. The two
        // narration MP3s (~5.4 MB, ~6.8 MB) and the TLE snapshot (~2.7 MB)
        // are intentionally precached (Global Constraints: narration must
        // work offline), so the limit must be raised to fit them.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'ASTROBENDER',
        short_name: 'ASTROBENDER',
        description:
          'Gerçek zamanlı uydu takibi ve sıkıştırılmış astronomik ölçekte etkileşimli 3D Güneş Sistemi.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#04060a',
        theme_color: '#04060a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
    proxy: {
      '/api/jpl-cad': {
        target: 'https://ssd-api.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/jpl-cad/, '/cad.api'),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) return 'three'
          if (id.includes('satellite.js')) return 'satellite'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'satellite.js'],
  },
})
