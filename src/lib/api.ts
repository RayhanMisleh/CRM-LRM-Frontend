import ky, { type HTTPError, type KyInstance, type Options } from 'ky'

import type { paths } from '@/types/openapi'

const isDev = process.env.NODE_ENV !== 'production'

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? ''

type SuccessStatus = '200' | '201' | '202' | '203' | '204' | '205' | '206'

export interface ApiHttpError extends HTTPError {
  status?: number
  payload?: unknown
  friendlyMessage?: string
}

export type ApiPaths = paths

type PathKey = keyof ApiPaths & string

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

type MethodForPath<P extends PathKey> = Extract<keyof ApiPaths[P], HttpMethod>

type Operation<P extends PathKey, M extends MethodForPath<P>> = ApiPaths[P] extends Record<string, any>
  ? ApiPaths[P][M] extends Record<string, any>
    ? ApiPaths[P][M]
    : never
  : never

type PathParams<P extends PathKey, M extends MethodForPath<P>> = Operation<P, M> extends {
  parameters: { path: infer Params }
}
  ? Params
  : Record<string, never>

type QueryParams<P extends PathKey, M extends MethodForPath<P>> = Operation<P, M> extends {
  parameters: { query: infer Params }
}
  ? Params
  : Record<string, never>

type RequestBody<P extends PathKey, M extends MethodForPath<P>> = Operation<P, M> extends {
  requestBody: { content: infer Content }
}
  ? Content[keyof Content]
  : never

type SuccessResponse<P extends PathKey, M extends MethodForPath<P>> = Operation<P, M> extends {
  responses: infer Responses
}
  ? Responses extends Record<string, any>
    ? Responses[Extract<keyof Responses, SuccessStatus>]
    : never
  : never

type ApiResponse<P extends PathKey, M extends MethodForPath<P>> = SuccessResponse<P, M> extends {
  content: infer Content
}
  ? Content[keyof Content]
  : void

interface ParseOptions {
  /**
   * Controla manualmente como a resposta será transformada.
   * Por padrão tenta parsear JSON e cai para texto quando o header não for JSON.
   */
  parseAs?: 'json' | 'text' | 'blob' | 'arrayBuffer'
}

export type ApiRequestOptions<P extends PathKey, M extends MethodForPath<P>> = Omit<
  Options,
  'method' | 'json' | 'searchParams' | 'body'
> &
  ParseOptions & {
    pathParams?: PathParams<P, M>
    query?: QueryParams<P, M>
    body?: RequestBody<P, M>
  }

const loggingHook = (stage: 'request' | 'response' | 'error', ...parts: unknown[]) => {
  if (!isDev) return
  // eslint-disable-next-line no-console
  console[stage === 'error' ? 'error' : 'debug']('[API]', ...parts)
}

const friendlyMessages: Record<number, string> = {
  400: 'Verifique os dados informados e tente novamente.',
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'O recurso solicitado não foi encontrado.',
  422: 'Existem dados inválidos. Revise o formulário e tente novamente.',
  429: 'Muitas requisições em sequência. Aguarde alguns instantes.',
}

const sharedClientOptions: Options = {
  timeout: 15_000,
  hooks: {
    beforeRequest: [
      (request) => {
        loggingHook('request', `${request.method?.toUpperCase()} ${request.url}`)
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        loggingHook('response', `${response.status} ${request.method?.toUpperCase()} ${request.url}`)
        return response
      },
    ],
    beforeError: [
      async (error) => {
        const apiError = error as ApiHttpError
        const { response } = apiError

        if (response) {
          apiError.status = response.status

          let payload: unknown
          try {
            const cloned = response.clone()
            payload = await cloned.json()
          } catch {
            try {
              payload = await response.clone().text()
            } catch {
              payload = undefined
            }
          }

          apiError.payload = payload

          const extracted = extractMessage(payload)
          const message = buildFriendlyMessage(response.status, extracted)

          apiError.friendlyMessage = message
          apiError.message = message
          apiError.name = 'ApiHttpError'

          loggingHook('error', `${response.status} ${response.url}`, payload ?? error)
        } else {
          apiError.friendlyMessage = 'Não foi possível se comunicar com o servidor.'
          loggingHook('error', error)
        }

        return apiError
      },
    ],
  },
}

export const apiClient: KyInstance = baseUrl
  ? ky.create({ prefixUrl: baseUrl, ...sharedClientOptions })
  : ky.create(sharedClientOptions)

export const createApiClient = (instance: KyInstance = apiClient) => instance

export const createOpenApiRequester = (client: KyInstance = apiClient) =>
  async function request<P extends PathKey, M extends MethodForPath<P>>(
    path: P,
    method: M,
    options: ApiRequestOptions<P, M> = {},
  ): Promise<ApiResponse<P, M>> {
    const { pathParams, query, body, parseAs = 'json', ...kyOptions } = options

    const resolvedPath = buildPath(path, pathParams as Record<string, unknown> | undefined)
    const searchParams = query ? toSearchParams(query) : undefined

    const requestOptions: Options = {
      ...kyOptions,
      method: method.toUpperCase() as Options['method'],
    }

    if (searchParams && [...searchParams.keys()].length > 0) {
      requestOptions.searchParams = searchParams
    }

    if (body !== undefined) {
      if (
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        body instanceof ArrayBuffer ||
        typeof body === 'string'
      ) {
        requestOptions.body = body as BodyInit
      } else {
        requestOptions.json = body as unknown
      }
    }

    const response = await client(resolvedPath, requestOptions)

    if (parseAs === 'text') {
      return (await response.text()) as ApiResponse<P, M>
    }

    if (parseAs === 'blob') {
      return (await response.blob()) as ApiResponse<P, M>
    }

    if (parseAs === 'arrayBuffer') {
      return (await response.arrayBuffer()) as ApiResponse<P, M>
    }

    if (!hasBody(response)) {
      return undefined as ApiResponse<P, M>
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      return (await response.json()) as ApiResponse<P, M>
    }

    return (await response.text()) as ApiResponse<P, M>
  }

export const request = createOpenApiRequester()

export const isApiError = (error: unknown): error is ApiHttpError =>
  error instanceof Error && 'response' in (error as Record<string, unknown>)

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Não foi possível concluir sua solicitação.',
): string => {
  if (isApiError(error) && error.friendlyMessage) {
    return error.friendlyMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return fallback
}

export const getApiErrorPayload = (error: unknown): unknown =>
  isApiError(error) ? error.payload : undefined

const buildPath = (template: string, params?: Record<string, unknown>) => {
  if (!params) return template

  return template.replace(/\{(.*?)\}/g, (_, key: string) => {
    if (!(key in params)) {
      throw new Error(`Parâmetro de rota "${key}" ausente para o path ${template}`)
    }

    const value = params[key]

    if (value === undefined || value === null) {
      throw new Error(`Valor inválido para o parâmetro de rota "${key}"`)
    }

    return encodeURIComponent(String(value))
  })
}

const toSearchParams = (query: Record<string, unknown>): URLSearchParams => {
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) return

    const value = rawValue as unknown

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item))
        }
      })
      return
    }

    searchParams.set(key, String(value))
  })

  return searchParams
}

const hasBody = (response: Response) => {
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return false
  }

  const length = response.headers.get('content-length')

  if (length === '0') {
    return false
  }

  return true
}

const extractMessage = (payload: unknown): string | undefined => {
  if (!payload) return undefined

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload === 'object') {
    const data = payload as Record<string, unknown>

    const possibleKeys = ['message', 'error', 'detail', 'title']

    for (const key of possibleKeys) {
      const value = data[key]
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
      }
    }
  }

  return undefined
}

const buildFriendlyMessage = (status?: number, extracted?: string): string => {
  if (extracted) {
    return extracted
  }

  if (!status) {
    return 'Não foi possível se comunicar com o servidor.'
  }

  const mapped = friendlyMessages[status]

  if (mapped) {
    return mapped
  }

  if (status >= 500) {
    return 'Estamos enfrentando instabilidades. Tente novamente em instantes.'
  }

  return 'Não foi possível concluir sua solicitação.'
}
