<script setup lang="ts">
const { app: { baseURL } } = useRuntimeConfig()
useHead({ link: [{ rel: 'icon', href: `${baseURL}favicon.ico` }] })
</script>

<template>
  <!-- NuxtLayout이란,, layouts/ 디렉토리에 정의된 레이아웃 파일(기본값은 default.vue)을 불러와 웹사이트의 공통 구조(예: 헤더, 푸터, 사이드바)를 렌더링합니다.

  NuxtPage 이란,,  pages/ 디렉토리에 있는 파일들을 기반으로, 현재 브라우저의 URL 주소와 일치하는 페이지 컴포넌트를 이 위치에 동적으로 삽입합니다. -->
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
