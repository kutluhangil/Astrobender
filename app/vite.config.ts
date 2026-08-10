import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

const TLE_GROUPS = {
  active: 'active',
  visual: 'visual',
  cosmos2251: 'cosmos-2251-debris',
  iridium33: 'iridium-33-debris',
  fengyun1c: 'fengyun-1c-debris',
} as const

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
        // js/css/html for the app shell, json/txt for the small
        // catalog/TLE snapshot files under public/data. Textures
        // (jpg/webp/png) and the cinematic-tour narration MP3s are
        // deliberately excluded from precache — both are large,
        // rarely-needed-on-first-visit assets that would otherwise compete
        // for bandwidth with the initial render, so they're runtime-cached
        // (textures) or runtime-cached-plus-explicit-prepare (audio)
        // instead. See sw.ts.
        globPatterns: ['**/*.{js,css,html,json,txt}'],
        // vite-plugin-pwa's default precache limit is 2 MiB. The TLE
        // snapshot (~2.7 MB) is intentionally precached as part of the app
        // shell, so the limit must be raised to fit it.
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
        // The client sends no query string (the serverless proxy rejects
        // them), so dev has to supply the same fixed upstream query the
        // proxy hardcodes — otherwise dev and production return different
        // data. Keep this in sync with JPL_CAD_URL in app/api/jpl-cad.ts.
        rewrite: () =>
          '/cad.api?date-min=now&date-max=%2B60&dist-max=0.2&diameter=true&fullname=true&sort=date',
      },
      '/api/tle': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => {
          const feed = new URL(path, 'http://localhost').searchParams.get('feed')
          const group = feed && Object.hasOwn(TLE_GROUPS, feed)
            ? TLE_GROUPS[feed as keyof typeof TLE_GROUPS]
            : 'invalid'
          return `/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase warning threshold (980KB is expected for a 3D app)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Manual chunk splitting: keeps Three.js + satellite.js separate from React UI
        // This allows the browser to cache heavy 3D libs independently of UI changes
        manualChunks(id) {
          // Three.js and related — heavy 3D core, changes rarely
          if (id.includes('three')) return 'three'
          // satellite.js — SGP4 propagation math, changes rarely
          if (id.includes('satellite.js')) return 'satellite'
          // React ecosystem — UI runtime
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['three', 'satellite.js'],
  },
})
