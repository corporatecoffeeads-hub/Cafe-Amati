import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona en GitHub Pages con cualquier nombre de repositorio
// (https://usuario.github.io/<repo>/) y también en un dominio propio.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
});
