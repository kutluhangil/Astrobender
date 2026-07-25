import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
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
          if (id.includes('three')) {
            return 'three'
          }
          // satellite.js — SGP4 propagation math, changes rarely
          if (id.includes('satellite.js')) {
            return 'satellite'
          }
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
