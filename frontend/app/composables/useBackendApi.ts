export type ApiResponse<T> = { data: T }
export type ApiError = { error: { code: string; message: string } }
export type ClientRecord = {
  id: string
  officeId: string
  name: string
  taxpayerKind: string
  status: string
}

export function useBackendApi() {
  const { public: { apiBase } } = useRuntimeConfig()

  return function request<T>(path: string, signal?: AbortSignal) {
    return $fetch<ApiResponse<T>>(path, {
      baseURL: apiBase,
      retry: 0,
      timeout: 7000,
      ...(signal ? { signal } : {}),
    })
  }
}
