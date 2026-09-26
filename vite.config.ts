import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: '頭痛ログ',
        short_name: '頭痛ログ',
        description: '頭痛の度合い・服薬・気圧を記録します',
        lang: 'ja',
        id: './',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['health', 'medical', 'lifestyle'],
        start_url: './',
        scope: './',
        background_color: '#f4f7f6',
        theme_color: '#0f766e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Android が丸や角丸に切り抜いても絵柄が欠けないよう、全面の背景で絵柄を中央に寄せた専用のアイコン
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // help.html・privacy.html は SPA ではない単独のページ。指定しないと、オフライン対応の仕組みが
        // これらへの移動をすべてアプリ本体（index.html）に差し替えてしまい、開けなくなる。
        // 照合はパス＋クエリ（?lang=ja など）に対して行われるので、クエリ付きも除外する
        navigateFallbackDenylist: [/\/help\.html(\?.*)?$/, /\/privacy\.html(\?.*)?$/],
      },
    }),
  ],
})
