import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',  // Ensure this is '/', not './'
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/*.png'],
      manifest: {
        name: 'Chinese Speech Translator',
        start_url: '/',
        scope: '/',
        short_name: 'Speech Translator',
        description: 'Real-time Chinese speech translation app',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/icons/vite.svg',
            sizes: '192x192',
            type: 'svg'
          },
          {
            src: '/icons/vite.svg',
            sizes: '512x512',
            type: 'svg'
          }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ]
});