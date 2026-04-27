import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names && assetInfo.names.find(it => it.endsWith('.css'))) {
            return 'assets/index.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
  server: {
    proxy: {
      '/ws': {
        target: 'http://127.0.0.1:3000',
        ws: true,
      },
      '/parse': {
        target: 'http://127.0.0.1:3000',
      },
      '/tokenizer': {
        target: 'http://127.0.0.1:3000',
      },
      '/chr': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
})
