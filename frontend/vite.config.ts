import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
