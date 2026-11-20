import { defineStore } from 'pinia'
import { computed, reactive, watch } from 'vue'
import type { AuthUser } from '../features/auth/user'

// 상태 타입
interface AuthState {
  user: AuthUser | null
}

// 초기 상태
const createInitialState = (): AuthState => ({
  user: null,
})

export const useAuthStore = defineStore('authStore', () => {
  // 1. 상태
  const state = reactive<AuthState>(createInitialState())

  // 2. Getters
  const isLoggedIn = computed(() => !!state.user)

  const isAdmin = computed(() => ['OWNER', 'ADMIN'].includes(state.user?.role ?? ''))

  const userInfo = computed(() => {
    const user = state.user
    if (!user) return null

    return {
      id: user.id,
      loginId: user.profile?.login_id ?? user.loginId,
      name: user.name,
      email: user.email,
      departmentName: user.departmentName,
      jobTitle: user.jobTitle,
      role: user.role,
      officeId: user.officeId,
      phone: user.phone,
    }
  })

  // 3. Actions
  function setUser(value: AuthUser) {
    state.user = value
  }

  function clear() {
    Object.assign(state, createInitialState())
  }

  // 4. 개발 환경 로그
  if (import.meta.dev) {
    watch(
      () => state.user,
      (user) => {
        if (!user) return

        console.log('[authStore] 로그인 사용자:', {
          id: user.id,
          loginId: user.profile?.login_id ?? user.loginId,
          name: user.name,
          role: user.role,
          officeId: user.officeId,
        })
      },
    )
  }

  return {
    state,
    isLoggedIn,
    isAdmin,
    userInfo,
    setUser,
    clear,
  }
})
