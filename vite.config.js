import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'e38c09053a7d.ngrok-free.app',
      '.ngrok-free.app', // 允許所有 ngrok 子域名
      '.ngrok.io' // 備用的 ngrok 域名
    ],
    cors: true
  }
})
