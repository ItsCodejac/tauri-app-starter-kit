import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        splash: resolve(__dirname, 'src/windows/splash.html'),
        settings: resolve(__dirname, 'src/windows/settings.html'),
        about: resolve(__dirname, 'src/windows/about.html'),
        shortcuts: resolve(__dirname, 'src/windows/shortcuts.html'),
        logs: resolve(__dirname, 'src/windows/logs.html'),
        update: resolve(__dirname, 'src/windows/update.html'),
        whatsnew: resolve(__dirname, 'src/windows/whatsnew.html'),
        welcome: resolve(__dirname, 'src/windows/welcome.html'),
      },
    },
  },
});
