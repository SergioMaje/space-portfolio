import { defineConfig } from 'vite';

// base relativa: funciona en https://<usuario>.github.io/space-portfolio/
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 700 },
});
