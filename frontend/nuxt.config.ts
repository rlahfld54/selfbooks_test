export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  // Nuxt 호환성 기준일
  compatibilityDate: '2025-07-15',

  // 개발 도구와 로컬 개발 서버
  devtools: {
    enabled: false,
  },

  devServer: {
    host: 'localhost',
    port: 3000,
  },

  // 전역 스타일
  css: ['~/assets/css/main.css'],

  // API, GitHub Pages 미리보기, Supabase 로그인
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:4000/api',
      pagesPreview: false,
      supabaseUrl: 'https://zxgcmeahprzuomgthqyg.supabase.co',
      supabasePublishableKey: 'sb_publishable_5xzGIKZDx7B-G_8QvKxoDA_m8ZUYjIj',
    },
  },

  // 페이지 기본 정보
  app: {
    head: {
      title: 'AAT | 세무회계 관리 시스템',
      htmlAttrs: {
        lang: 'ko',
      },
      meta: [
        {
          name: 'description',
          content: 'AAT 세무회계 통합 관리 시스템',
        },
      ],
    },
  },
})
