import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' — относительные пути: одна и та же сборка работает
// и на GitHub Pages (/perimetr-soc/), и в архиве для itch.io.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
