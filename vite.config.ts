import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Eng-ception',
        short_name: 'Eng-ception',
        description: '한국어 사고를 자연스러운 영어 구문으로 재배치하는 5형식 훈련 앱',
        lang: 'ko',
        categories: ['education'],
        theme_color: '#111113',
        background_color: '#111113',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Share Target (GET): the OS share sheet hands shared text to the installed PWA at
        // /?title=&text=&url=. GET needs no service-worker fetch handler (Home reads location.search).
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
      workbox: {
        // The Claude proxy is same-origin: keep the SPA navigate-fallback from serving
        // index.html for /api requests. (Firestore/Auth are cross-origin googleapis —
        // outside same-origin navigate-fallback and matched by no runtime rule, so they
        // pass through uncached; no rule needed.)
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
