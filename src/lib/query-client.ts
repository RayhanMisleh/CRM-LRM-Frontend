'use client'

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getApiErrorMessage, isApiError } from '@/lib/api'

const isBrowser = () => typeof window !== 'undefined'

const handleError = (error: unknown) => {
  const message = getApiErrorMessage(error)

  if (isBrowser()) {
    toast.error(message)
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[React Query] erro capturado', error)
    if (isApiError(error) && error.payload) {
      // eslint-disable-next-line no-console
      console.error('[React Query] payload da API', error.payload)
    }
  }
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,
        throwOnError: false,
      },
      mutations: {
        retry: 0,
        throwOnError: false,
      },
    },
    queryCache: new QueryCache({
      onError: handleError,
    }),
    mutationCache: new MutationCache({
      onError: handleError,
    }),
  })

let queryClient: QueryClient | null = null

export const getQueryClient = () => {
  if (!queryClient) {
    queryClient = createQueryClient()
  }

  return queryClient
}
