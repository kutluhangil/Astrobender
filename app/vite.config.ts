import path from "path"
import { pathToFileURL } from "url"
import type { IncomingMessage, ServerResponse } from "http"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// The same handlers Vercel deploys, so dev and preview return exactly the
// shapes production does instead of proxying raw upstream payloads.
const API_ROUTES: Record<string, string> = {
  '/api/tle': path.resolve(__dirname, '../api/tle.ts'),
  '/api/jpl-cad': path.resolve(__dirname, 'api/jpl-cad.ts'),
  '/api/nasa-feed': path.resolve(__dirname, 'api/nasa-feed.ts'),
  '/api/health': path.resolve(__dirname, '../api/health.ts'),
}

type ApiHandler = (
  request: { method?: string; url?: string },
  response: {
    setHeader(name: string, value: string): void
    status(code: number): unknown
    json(body: unknown): void
    send(body: string): void
  },
) => unknown

function vercelResponse(res: ServerResponse) {
  const response = {
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
    status(code: number) {
      res.statusCode = code
      return response
    },
    json(body: unknown) {
      if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(body))
    },
    send(body: string) {
      res.end(body)
    },
  }
  return response
}

function astrobenderApi(): Plugin {
  const handle = (load: (file: string) => Promise<{ default: ApiHandler }>) =>
    async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = req.url ?? ''
      const file = API_ROUTES[url.split('?')[0]]
      if (!file) {
        next()
        return
      }
      try {
        const module = await load(file)
        await module.default({ method: req.method, url }, vercelResponse(res))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({
          error: `Local API handler for ${url} threw: ${error instanceof Error ? error.message : String(error)}`,
        }))
      }
    }
  // Node 24 strips the handlers' type annotations natively. Vite's SSR module
  // runner is avoided on purpose: its first invocation can stall for its full
  // 60 s transport timeout while dependency pre-bundling is still running.
  const load = (file: string) => import(pathToFileURL(file).href) as Promise<{ default: ApiHandler }>
  return {
    name: 'astrobender-api',
    configureServer(server) {
      server.middlewares.use(handle(load))
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle(load))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    astrobenderApi(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // js/css/html for the app shell, json/csv for the small
        // catalog and GP (OMM) snapshot files under public/data. Textures
        // (jpg/webp/png) and the cinematic-tour narration MP3s are
        // deliberately excluded from precache — both are large,
        // rarely-needed-on-first-visit assets that would otherwise compete
        // for bandwidth with the initial render, so they're runtime-cached
        // (textures) or runtime-cached-plus-explicit-prepare (audio)
        // instead. See sw.ts.
        globPatterns: ['**/*.{js,css,html,json,csv}'],
        // vite-plugin-pwa's default precache limit is 2 MiB. The active GP
        // snapshot (~2.2 MB) is intentionally precached as part of the app
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
        lang: 'tr',
        dir: 'ltr',
        categories: ['education', 'science', 'utilities'],
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
          // astronomy-engine — ephemerides for Skywatch and the planner, changes rarely
          if (id.includes('node_modules/astronomy-engine')) return 'astronomy'
          // Generated catalogs (bright stars, probe ephemeris) change only when
          // their scripts re-run, so they cache independently of app code.
          if (id.includes('/src/lib/generated/')) return 'catalog-data'
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
