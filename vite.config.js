import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Гасим шумные ошибки прокси: они возникают при перезапуске бэкенда
// (node --watch) — socket.io на клиенте сам переподключается.
function quietProxy(proxy) {
  proxy.on('error', (_err, _req, socketOrRes) => {
    if (socketOrRes && !socketOrRes.destroyed && typeof socketOrRes.end === 'function') {
      socketOrRes.end();
    }
  });
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: quietProxy,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        configure: quietProxy,
      },
    },
  },
});
