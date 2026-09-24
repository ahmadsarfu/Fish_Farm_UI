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
        runtimeCaching: [
          {
            // urlPattern: /^http:\/\/localhost:8080\/.*/,
            // urlPattern: /^http:\/\/192\.168\.1\.8:8080\/.*/,
            // urlPattern: /^http:\/\/10\.10\.5\.197:8080\/.*/,
            urlPattern: /^https:\/\/placed-graduate-amy-welding\.trycloudflare\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } // 1 day
            }
          }
        ]
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

