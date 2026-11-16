import { ApiRequestError, createApiClient } from '~/services/api-client'
import { useAuth } from '~/features/auth/useAuth'

export function useBackendApi(timeout?: number) {
  const { public: { apiBase, pagesPreview } } = useRuntimeConfig()
  const auth = useAuth()
  return createApiClient(async (path, options) => {
    if (pagesPreview) {
      throw new ApiRequestError(undefined, 'PREVIEW_ONLY', '공개 미리보기에서는 실제 API를 사용할 수 없습니다.', undefined)
    }
    const revision = auth.revision.value
    const headers = await auth.headers()
    options.signal?.throwIfAborted()
    // ofetch applies its own timeout only when the caller supplies no signal.
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(options.timeout)])
      : undefined
    try {
      return await $fetch(path, { ...options, signal, headers })
    } catch (error) {
      const failure = error as { status?: number; statusCode?: number } | null
      if (!options.signal?.aborted && (failure?.status ?? failure?.statusCode) === 401) {
        await auth.expireSession(headers.Authorization, revision).catch(() => undefined)
      }
      throw error
    }
  }, apiBase, 'same-origin', timeout)
}
