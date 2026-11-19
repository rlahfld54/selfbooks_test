import { defineStore } from 'pinia'

interface User {
  id: string
  name: string
  role: 'admin' | 'staff'
  taxOfficeId: string
}

//로그인 사용자
export const useAuthStore = defineStore('authStore', () => {
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchUser() {
    const data = await $fetch<User>('/api/auth/me')
    user.value = data
  }

  function clear() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    isAdmin,
    fetchUser,
    clear,
  }
})
