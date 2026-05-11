import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true, timeout: 600000 },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
