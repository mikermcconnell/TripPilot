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
          navigateFallbackDenylist: [/^\/api/, /^\/auth/],
          // Don't let the service worker intercept Google Maps/Firebase requests
          // This prevents CSP test failures and network errors
          runtimeCaching: [
            {
              // Cache static map tiles only (images)
              urlPattern: /^https:\/\/maps\.gstatic\.com\/.*\.(png|jpg|jpeg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-maps-tiles',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ],
          // Exclude external APIs from service worker completely
          // This prevents the SW from intercepting and failing on CSP tests
          skipWaiting: true,
          clientsClaim: true
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
