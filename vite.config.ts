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
      minify: 'esbuild',
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: {},
        },
      }
    },
    esbuild: {
      drop: isProduction ? ['console'] : [],
    },
  };
});
