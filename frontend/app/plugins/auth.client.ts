import { createClient } from '@supabase/supabase-js'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/authStore'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const storage = {
    getItem(key: string) { return localStorage.getItem(key) ?? sessionStorage.getItem(key) },
    setItem(key: string, value: string) {
      const remember = localStorage.getItem('selfbooks:remember') === 'true'
      ;(remember ? localStorage : sessionStorage).setItem(key, value)
      ;(remember ? sessionStorage : localStorage).removeItem(key)
    },
    removeItem(key: string) { localStorage.removeItem(key); sessionStorage.removeItem(key) },
  }
  const authClient = !config.pagesPreview && config.supabaseUrl && config.supabasePublishableKey
    ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { storage, storageKey: 'selfbooks:auth', flowType: 'pkce', detectSessionInUrl: false },
    }) : null
  const { user } = storeToRefs(useAuthStore())
  const revision = useState('auth-revision', () => 0)
  const restoreIssue = useState('auth-restore-issue', () => '')
  authClient?.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (session && user.value && session.user.id !== user.value.id)) {
      revision.value++
      user.value = null
      restoreIssue.value = ''
    }
  })
  return { provide: { authClient } }
})
