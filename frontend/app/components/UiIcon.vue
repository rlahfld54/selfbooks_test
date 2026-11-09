<script setup lang="ts">
withDefaults(defineProps<{ name?: string; size?: number }>(), { name: 'grid', size: 20 })
const paths: Record<string, string> = {
 home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
 document: 'M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6',
 bag: 'M4 8h16l-1 13H5zM8 8V6a4 4 0 0 1 8 0v2',
 users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4',
 calendar: 'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18M7 14h3M14 14h3M7 18h3',
 chart: 'M4 3v18h17M8 16v-5M13 16V7M18 16v-8',
 settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
 grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 menu: 'M4 6h16M4 12h16M4 18h16', search: 'M21 21l-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
 close: 'm6 6 12 12M18 6 6 18', chevron: 'm9 5 7 7-7 7', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-5-5 5 5-5 5', check: 'm5 12 4 4L19 6',
 help: 'M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v7h4v-7zM20 12h2v7h-4v-7zM18 21h-6',
 wallet: 'M3 6h17v15H3zM3 6V3h14v3M15 12h6v5h-6z'
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.grid" /></svg></template>

