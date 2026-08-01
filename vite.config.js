import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths so the site works at imperialspaceforce.com/silicon-empire/
  base: './',
  server: {
    port: Number(process.env.PORT) || 5173,
  },
});
