import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthUser } from '../features/auth/user'

//로그인 사용자
export const useAuthStore = defineStore('authStore', () => {
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'OWNER' || user.value?.role === 'ADMIN')

  function setUser(value: AuthUser) {
    user.value = value
  }

  function clear() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    isAdmin,
    setUser,
    clear,
  }
})
