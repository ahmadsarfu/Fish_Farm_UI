import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Machli Farm Management',
        short_name: 'Machli Farm',
        description: 'Fish pond harvest and inventory tracking',
        theme_color: '#0f5132',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['clear-api-cache.js'],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkOnly'
        }]
      }
    })
  ],

  // preview: {
  //   host: true,
  //   port: 4174,
  //   allowedHosts: ['www.machli.com']
  // }

  preview: {
    host: true,
    port: 4174,
    allowedHosts: true
  }
})

