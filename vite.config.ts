import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'CONSTRA',
        short_name: 'CONSTRA',
        description: 'CONSTRA: anote cargas, reps e progressão de cada exercício. Offline, rápido, no bolso.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // GIFs de 360p do espelho Gymvisual (ExerciseGymGifsDB). A URL é
            // fixada na versão v1.1.0, então o cache pode ser permanente.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/JahelCuadrado\/ExerciseGymGifsDB@v1\.1\.0\/.*\.gif$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gymvisual-gifs',
              expiration: { maxEntries: 400, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fallback: GIFs de 180p da AscendAPI (baixados sob demanda). As URLs
            // rotacionam toda segunda 00:00 UTC, então o cache expira antes (6 dias).
            urlPattern: /^https:\/\/static\.exercisedb\.dev\/.*\.gif$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ascend-gifs',
              expiration: { maxEntries: 200, maxAgeSeconds: 6 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
