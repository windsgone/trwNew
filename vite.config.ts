import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './src/manifest';

export default defineConfig(({ command }) => {
  const isProduction = command === 'build';
  
  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [crx({ manifest })],
    build: {
      minify: isProduction,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: {},
        },
      },
      terserOptions: {
        compress: {
          drop_console: isProduction,
        },
      },
    },
    esbuild: {
      drop: isProduction ? ['console'] : [],
    },
  };
});
