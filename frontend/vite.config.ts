import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/ppg':  { target: 'http://127.0.0.1:8001', rewrite: (path) => path.replace('/api/ppg', '') },
      '/api/ba':   { target: 'http://127.0.0.1:8002', rewrite: (path) => path.replace('/api/ba', '') },
      '/api/test': { target: 'http://127.0.0.1:8003', rewrite: (path) => path.replace('/api/test', '') },
      '/sites':    { target: 'http://127.0.0.1:8001' },
    },
  },
});
