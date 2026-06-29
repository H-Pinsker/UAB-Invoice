import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The `base` must match the GitHub Pages sub-path: https://<user>.github.io/UAB-Invoice/
// Override locally with `--base=/` if needed.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/UAB-Invoice/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
