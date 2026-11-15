import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    (cesium as any).default ? (cesium as any).default() : (cesium as any)()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
