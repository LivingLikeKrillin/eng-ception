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
        name: 'Eng-ception',
        short_name: 'Eng-ception',
        description: '한국어 사고를 영어 발화 구조로 재구성하는 훈련 앱',
        theme_color: '#111113',
        background_color: '#111113',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logo.png', sizes: 'any', type: 'image/png' },
          { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
