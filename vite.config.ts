import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'robots.txt'],
        manifest: {
          name: 'TripPilot - AI Travel Planner',
          short_name: 'TripPilot',
          description: 'AI-powered travel itinerary planning',
          theme_color: '#3b82f6',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Exclude Google Maps API from service worker - causes CSP/caching issues
          navigateFallbackDenylist: [/^\/api/, /^\/auth/],
          runtimeCaching: [
            {
              // Only cache static Google Maps tiles/images
              urlPattern: /^https:\/\/maps\.(googleapis|gstatic)\.com\/.*\.(png|jpg|jpeg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-maps-tiles',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            },
            {
              // Network-only for Google Maps API calls (JS, gen_204, etc.)
              urlPattern: /^https:\/\/maps\.googleapis\.com\/maps\/api\/.*/i,
              handler: 'NetworkOnly'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY)
    },
    server: {
      port: 3000,
      host: true
    },
    build: {
      target: 'esnext',
      sourcemap: true
    }
  };
});
