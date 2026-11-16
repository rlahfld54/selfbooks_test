export type ApiResponse<T> = { data: T }
export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: object
  signal?: AbortSignal
}
type Transport = <T>(path: string, options: ApiRequestOptions & {
  baseURL: string
  credentials: RequestCredentials
  retry: number
  timeout: number
}) => Promise<T>

export class ApiRequestError extends Error {
  readonly status: number | undefined
  readonly code: string
  constructor(status: number | undefined, code: string, message: string, cause: unknown) {
    super(message, { cause })
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

export function createApiClient(
  transport: Transport,
  baseURL: string,
  credentials: RequestCredentials = 'same-origin',
  timeout = 7000,
) {
  return async function request<T>(path: string, input?: AbortSignal | ApiRequestOptions) {
    const options = input instanceof AbortSignal ? { signal: input } : input
    const signal = options?.signal
    try {
      signal?.throwIfAborted()
      return await transport<ApiResponse<T>>(path, { ...options, baseURL, credentials, retry: 0, timeout })
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      if (error instanceof ApiRequestError) throw error
      const failure = error as { status?: number; statusCode?: number; data?: { error?: { code?: unknown; message?: unknown } } } | null
      const body = failure?.data?.error
      const status = failure?.status ?? failure?.statusCode
      throw new ApiRequestError(
        status,
        typeof body?.code === 'string' ? body.code : 'REQUEST_FAILED',
        typeof body?.message === 'string' ? body.message : status === 403
          ? '이 업무에 접근할 권한이 없습니다.'
          : '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        error,
      )
    }
  }
}

