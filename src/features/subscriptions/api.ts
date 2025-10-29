import { useMemo } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  type CreateClientSubscriptionInput,
  type UpdateClientSubscriptionInput,
} from '@/features/clients/api'
import { createApiClient } from '@/lib/api'

const subscriptionsApi = createApiClient()

export interface SubscriptionClientSummary {
  id: string
  companyName: string
  tradeName?: string | null
}

export interface SubscriptionContractSummary {
  id: string
  title: string
}

export interface Subscription {
  id: string
  clientId: string
  client?: SubscriptionClientSummary | null
  contractId?: string | null
  contract?: SubscriptionContractSummary | null
  planName: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | string
  amount?: number | null
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | string | null
  startedAt?: string | null
  renewsAt?: string | null
  nextCharge?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface SubscriptionListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface SubscriptionListResponse {
  data: Subscription[]
  meta?: SubscriptionListMeta
}

export interface SubscriptionListFilters {
  page?: number
  pageSize?: number
  status?: string
  clientId?: string
  cycle?: string
  nextCharge?: string
}

export type CreateSubscriptionInput = CreateClientSubscriptionInput
export type UpdateSubscriptionInput = UpdateClientSubscriptionInput

const queryKeys = {
  list: (filters: SubscriptionListFilters = {}) =>
    [
      'subscriptions',
      'list',
      filters.page ?? null,
      filters.pageSize ?? null,
      filters.status ?? null,
      filters.clientId ?? null,
      filters.cycle ?? null,
      filters.nextCharge ?? null,
    ] as const,
  detail: (id: string) => ['subscriptions', 'detail', id] as const,
}

const buildSearchParams = (filters: SubscriptionListFilters = {}) => {
  const params = new URLSearchParams()

  if (filters.page) {
    params.set('page', String(filters.page))
  }

  if (filters.pageSize) {
    params.set('pageSize', String(filters.pageSize))
  }

  if (filters.status) {
    params.set('status', filters.status)
  }

  if (filters.clientId) {
    params.set('clientId', filters.clientId)
  }

  if (filters.cycle) {
    params.set('cycle', filters.cycle)
  }

  if (filters.nextCharge) {
    params.set('nextCharge', filters.nextCharge)
  }

  return params
}

const fetchSubscriptions = async (filters: SubscriptionListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await subscriptionsApi.get('subscriptions', {
    searchParams,
  })

  return (await response.json()) as SubscriptionListResponse
}

const fetchSubscription = async (id: string) => {
  const response = await subscriptionsApi.get(`subscriptions/${id}`)
  return (await response.json()) as Subscription
}

const createSubscription = async (input: CreateSubscriptionInput) => {
  const response = await subscriptionsApi.post('subscriptions', { json: input })
  return (await response.json()) as Subscription
}

const updateSubscription = async ({ id, ...input }: UpdateSubscriptionInput) => {
  const response = await subscriptionsApi.put(`subscriptions/${id}`, { json: input })
  return (await response.json()) as Subscription
}

const deleteSubscription = async (id: string) => {
  await subscriptionsApi.delete(`subscriptions/${id}`)
  return id
}

export const useSubscriptions = (filters: SubscriptionListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      clientId: filters.clientId,
      cycle: filters.cycle,
      nextCharge: filters.nextCharge,
    }),
    [
      filters.clientId,
      filters.cycle,
      filters.nextCharge,
      filters.page,
      filters.pageSize,
      filters.status,
    ],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchSubscriptions(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useSubscription = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchSubscription(id),
    enabled: options?.enabled ?? true,
  })
}

export const useCreateSubscription = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSubscription,
    onSuccess: (subscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      if (subscription?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(subscription.id) })
      }
    },
  })
}

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSubscription,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      if (id) {
        queryClient.removeQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}
