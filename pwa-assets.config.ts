import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Source = the existing 512×512 public/logo.png. The minimal-2023 preset emits
// pwa-64/192/512, a maskable-512 WITH safe-zone padding (so Android masks don't clip
// the logo), apple-touch-180, and favicon.ico.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/logo.png'],
})
