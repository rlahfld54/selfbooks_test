export type ApiResponse<T> = { data: T }
type Transport = <T>(path: string, options: {
  baseURL: string
  credentials: RequestCredentials
  signal?: AbortSignal
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

export function createApiClient(transport: Transport, baseURL: string, credentials: RequestCredentials = 'same-origin') {
  return async function request<T>(path: string, signal?: AbortSignal) {
    try {
      return await transport<ApiResponse<T>>(path, { baseURL, credentials, signal, retry: 0, timeout: 7000 })
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      const failure = error as { status?: number; data?: { error?: { code?: unknown; message?: unknown } } } | null
      const body = failure?.data?.error
      throw new ApiRequestError(
        failure?.status,
        typeof body?.code === 'string' ? body.code : 'REQUEST_FAILED',
        typeof body?.message === 'string' ? body.message : 'API request failed',
        error,
      )
    }
  }
}

