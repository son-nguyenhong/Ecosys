import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/ppg': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/ppg', ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Proxy /api/ppg] Error:', err.message);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('[Proxy /api/ppg]', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[Proxy /api/ppg] Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/ba': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/ba', ''),
      },
      '/api/test': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/test', ''),
      },
      '/sites': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
});
