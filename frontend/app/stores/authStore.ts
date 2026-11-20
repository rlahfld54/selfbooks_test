import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { AuthUser } from '../features/auth/user'

export const useAuthStore = defineStore('authStore', () => {
  // 1. 상태
  const user = ref<AuthUser | null>(null)

  // 2. Getters
  const userInfo = computed(() => user.value)

  const isLoggedIn = computed(() => !!user.value)

  const isAdmin = computed(() => ['OWNER', 'ADMIN'].includes(user.value?.role ?? ''))

  // 3. Actions
  function setUser(value: AuthUser) {
    user.value = value
  }

  function clear() {
    user.value = null
  }

  // 4. 개발 환경 로그
  if (import.meta.dev) {
    watch(user, (value) => {
      if (!value) return

      console.log('[authStore] 로그인 통합 조회 결과:', JSON.parse(JSON.stringify(value)))
    })
  }

  return {
    user,
    userInfo,
    isLoggedIn,
    isAdmin,
    setUser,
    clear,
  }
})
