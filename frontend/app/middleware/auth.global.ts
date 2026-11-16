import { useAuth } from '~/features/auth/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || useRuntimeConfig().public.pagesPreview) return
  if (['/', '/login', '/register', '/forgot-password', '/auth/callback'].includes(to.path.replace(/\/$/, '') || '/')) return

  const nuxtApp = useNuxtApp()
  const router = useRouter()
  const auth = useAuth()
  if (!auth.user.value && !auth.restoreIssue.value) await auth.restore()
  if (auth.user.value || auth.restoreIssue.value) return

  if (nuxtApp.isHydrating && nuxtApp.payload.serverRendered) {
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
      if (router.currentRoute.value.fullPath === to.fullPath && !auth.user.value) {
        void router.replace('/login')
      }
    })
    return
  }
  return navigateTo('/login')
})
