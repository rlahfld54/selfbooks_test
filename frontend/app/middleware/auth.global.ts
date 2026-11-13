import { useAuth } from '~/features/auth/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || useRuntimeConfig().public.pagesPreview) return
  if (['/', '/login', '/register', '/forgot-password'].includes(to.path)) return
  const auth = useAuth()
  await auth.restore()
  if (!auth.user.value) return navigateTo('/login')
})
