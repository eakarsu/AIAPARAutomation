import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT) || 5373,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || 4101}`,
        changeOrigin: true,
      },
    },
  },
});
