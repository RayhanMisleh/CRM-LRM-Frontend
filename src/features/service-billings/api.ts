import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import { createApiClient } from '@/lib/api'
import type { ClientServiceCategory } from '@/features/client-services/api'

const serviceBillingsApi = createApiClient()

export type ServiceBillingStatus = 'scheduled' | 'active' | 'paused' | 'cancelled' | 'ended' | string
export type ServiceBillingCycle = 'monthly' | 'bimonthly' | 'quarterly' | 'semester' | 'yearly' | string

export interface ServiceBillingServiceSummary {
  id: string
  name: string
  clientId: string
  clientName?: string | null
  status?: string | null
  supportLevel?: string | null
  category?: ClientServiceCategory | null
  monthlyFee?: number | null
  developmentFee?: number | null
}

export interface ServiceBilling {
  id: string
  clientServiceId: string
  service?: ServiceBillingServiceSummary | null
  status: ServiceBillingStatus
  cycle: ServiceBillingCycle
  startDate?: string | null
  endDate?: string | null
  monthlyAmount?: number | null
  adjustmentIndex?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ServiceBillingListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ServiceBillingListResponse {
  data: ServiceBilling[]
  meta?: ServiceBillingListMeta
}

export interface ServiceBillingListFilters {
  page?: number
  pageSize?: number
  clientServiceId?: string
  clientId?: string
  status?: string
  cycle?: string
  startDate?: string
  endDate?: string
  search?: string
}

export type CreateServiceBillingInput = {
  clientServiceId: string
  status?: ServiceBillingStatus
  cycle: ServiceBillingCycle
  startDate?: string | null
  endDate?: string | null
  monthlyAmount?: number | null
  adjustmentIndex?: string | null
  notes?: string | null
}

export type UpdateServiceBillingInput = Partial<CreateServiceBillingInput> & { id: string }

const queryKeys = {
  list: (filters: ServiceBillingListFilters = {}): QueryKey => ['service-billings', 'list', filters],
  detail: (id: string): QueryKey => ['service-billings', 'detail', id],
} as const

const buildSearchParams = (filters: ServiceBillingListFilters = {}) => {
  const params = new URLSearchParams()

  const entries: Array<[keyof ServiceBillingListFilters, (value: unknown) => boolean]> = [
    ['page', (value) => typeof value === 'number' && Number.isFinite(value)],
    ['pageSize', (value) => typeof value === 'number' && Number.isFinite(value)],
    ['clientServiceId', (value) => Boolean(value)],
    ['clientId', (value) => Boolean(value)],
    ['status', (value) => Boolean(value)],
    ['cycle', (value) => Boolean(value)],
    ['startDate', (value) => Boolean(value)],
    ['endDate', (value) => Boolean(value)],
    ['search', (value) => Boolean(value)],
  ]

  entries.forEach(([key, predicate]) => {
    const value = filters[key]
    if (value !== undefined && value !== null && predicate(value)) {
      params.set(key, String(value))
    }
  })

  return params
}

const fetchServiceBillings = async (filters: ServiceBillingListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await serviceBillingsApi.get('service-billings', { searchParams })
  return (await response.json()) as ServiceBillingListResponse
}

const fetchServiceBilling = async (id: string) => {
  const response = await serviceBillingsApi.get(`service-billings/${id}`)
  return (await response.json()) as ServiceBilling
}

const createServiceBilling = async (input: CreateServiceBillingInput) => {
  const response = await serviceBillingsApi.post('service-billings', { json: input })
  return (await response.json()) as ServiceBilling
}

const updateServiceBilling = async ({ id, ...input }: UpdateServiceBillingInput) => {
  const response = await serviceBillingsApi.put(`service-billings/${id}`, { json: input })
  return (await response.json()) as ServiceBilling
}

const deleteServiceBilling = async (id: string) => {
  await serviceBillingsApi.delete(`service-billings/${id}`)
  return id
}

export const useServiceBillings = (filters: ServiceBillingListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      clientServiceId: filters.clientServiceId,
      clientId: filters.clientId,
      status: filters.status,
      cycle: filters.cycle,
      startDate: filters.startDate,
      endDate: filters.endDate,
      search: filters.search,
    }),
    [
      filters.cycle,
      filters.clientId,
      filters.clientServiceId,
      filters.endDate,
      filters.page,
      filters.pageSize,
      filters.search,
      filters.startDate,
      filters.status,
    ],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchServiceBillings(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useServiceBilling = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchServiceBilling(id),
    enabled: options?.enabled ?? true,
  })
}

export const useCreateServiceBilling = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createServiceBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-billings'] })
    },
  })
}

export const useUpdateServiceBilling = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateServiceBilling,
    onSuccess: (serviceBilling) => {
      queryClient.invalidateQueries({ queryKey: ['service-billings'] })
      if (serviceBilling?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(serviceBilling.id) })
      }
    },
  })
}

export const useDeleteServiceBilling = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteServiceBilling,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['service-billings'] })
      if (id) {
        queryClient.removeQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}
