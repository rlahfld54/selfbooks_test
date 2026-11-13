// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { host: 'localhost', port: 3000 },
  runtimeConfig: { public: { apiBase: 'http://localhost:4000/api', pagesPreview: false, supabaseUrl: '', supabasePublishableKey: '' } },
  css: ['~/assets/css/tokens.css', '~/assets/main.css', '~/assets/css/components.css'],
  app: {
    // Nuxt resolves app.baseURL from NUXT_APP_BASE_URL, defaulting to '/'.
    head: {
      title: 'Accounting Pro',
      htmlAttrs: { lang: 'ko' },
      meta: [
        { name: 'description', content: 'AAT · AI Accounting Tax 공통 UI 데모 — 샘플 데이터' },
      ],
    },
  },
})
