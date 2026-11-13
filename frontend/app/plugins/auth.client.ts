import { createClient } from '@supabase/supabase-js'

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
  const authClient = config.supabaseUrl && config.supabasePublishableKey
    ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { storage, storageKey: 'selfbooks:auth', detectSessionInUrl: false },
    }) : null
  const user = useState('auth-user', () => null)
  authClient?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') user.value = null
  })
  return { provide: { authClient } }
})
