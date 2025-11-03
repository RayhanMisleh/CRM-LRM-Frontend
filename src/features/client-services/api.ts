import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import { createApiClient } from '@/lib/api'

const clientServicesApi = createApiClient()

export type ClientServiceStatus = 'draft' | 'active' | 'paused' | 'suspended' | 'terminated' | 'archived' | string
export type ClientServiceSupportLevel = 'basic' | 'standard' | 'premium' | 'enterprise' | string
export type ClientServiceBillingCycle = 'monthly' | 'bimonthly' | 'quarterly' | 'semester' | 'yearly' | string
export type ClientServiceCategory = 'APPS' | 'SITES' | 'SOFTWARE' | 'AUTOMATIONS' | 'OTHERS'

export interface ClientServiceResponsible {
  name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
}

export interface ClientServiceClientSummary {
  id: string
  name: string
  tradeName?: string | null
}

export interface ClientServiceContractSummary {
  id: string
  title: string
  status?: string | null
}

export interface ClientService {
  id: string
  clientId: string
  contractId?: string | null
  category: ClientServiceCategory
  status: ClientServiceStatus
  responsible?: ClientServiceResponsible | null
  hostingProvider?: string | null
  repositoryUrls?: string[] | null
  environmentLinks?: Record<string, string> | null
  monthlyFee?: number | null
  developmentFee?: number | null
  billingCycle?: ClientServiceBillingCycle | null
  supportLevel?: ClientServiceSupportLevel | null
  startDate?: string | null
  goLiveDate?: string | null
  endDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
  client?: ClientServiceClientSummary | null
  contract?: ClientServiceContractSummary | null
}

export interface ClientServiceListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ClientServiceListResponse {
  data: ClientService[]
  meta?: ClientServiceListMeta
}

export interface ClientServiceListFilters {
  page?: number
  pageSize?: number
  clientId?: string
  status?: string
  category?: ClientServiceCategory
  contractId?: string
  startDate?: string
  endDate?: string
  billingCycle?: string
  supportLevel?: string
  search?: string
}

export type CreateClientServiceInput = {
  clientId: string
  category: ClientServiceCategory
  contractId?: string | null
  status?: ClientServiceStatus
  responsible?: ClientServiceResponsible | null
  hostingProvider?: string | null
  repositoryUrls?: string[] | null
  environmentLinks?: Record<string, string> | null
  monthlyFee?: number | null
  developmentFee?: number | null
  billingCycle?: ClientServiceBillingCycle | null
  supportLevel?: ClientServiceSupportLevel | null
  startDate?: string | null
  goLiveDate?: string | null
  endDate?: string | null
  notes?: string | null
}

export type UpdateClientServiceInput = Partial<CreateClientServiceInput> & { id: string }

const queryKeys = {
  list: (filters: ClientServiceListFilters = {}): QueryKey => ['client-services', 'list', filters],
  detail: (id: string): QueryKey => ['client-services', 'detail', id],
} as const

const buildSearchParams = (filters: ClientServiceListFilters = {}) => {
  const params = new URLSearchParams()

  const entries: Array<[keyof ClientServiceListFilters, (value: unknown) => boolean]> = [
    ['page', (value) => typeof value === 'number' && Number.isFinite(value)],
    ['pageSize', (value) => typeof value === 'number' && Number.isFinite(value)],
    ['clientId', (value) => Boolean(value)],
    ['status', (value) => Boolean(value)],
    ['category', (value) => Boolean(value)],
    ['contractId', (value) => Boolean(value)],
    ['startDate', (value) => Boolean(value)],
    ['endDate', (value) => Boolean(value)],
    ['billingCycle', (value) => Boolean(value)],
    ['supportLevel', (value) => Boolean(value)],
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

const fetchClientServices = async (filters: ClientServiceListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await clientServicesApi.get('client-services', { searchParams })
  return (await response.json()) as ClientServiceListResponse
}

const fetchClientService = async (id: string) => {
  const response = await clientServicesApi.get(`client-services/${id}`)
  return (await response.json()) as ClientService
}

const createClientService = async (input: CreateClientServiceInput) => {
  const response = await clientServicesApi.post('client-services', { json: input })
  return (await response.json()) as ClientService
}

const updateClientService = async ({ id, ...input }: UpdateClientServiceInput) => {
  const response = await clientServicesApi.put(`client-services/${id}`, { json: input })
  return (await response.json()) as ClientService
}

const deleteClientService = async (id: string) => {
  await clientServicesApi.delete(`client-services/${id}`)
  return id
}

export const useClientServices = (filters: ClientServiceListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      clientId: filters.clientId,
      status: filters.status,
      category: filters.category,
      contractId: filters.contractId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      billingCycle: filters.billingCycle,
      supportLevel: filters.supportLevel,
      search: filters.search,
    }),
    [
      filters.billingCycle,
      filters.category,
      filters.clientId,
      filters.contractId,
      filters.endDate,
      filters.page,
      filters.pageSize,
      filters.search,
      filters.startDate,
      filters.status,
      filters.supportLevel,
    ],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchClientServices(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useClientService = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchClientService(id),
    enabled: options?.enabled ?? true,
  })
}

export const useCreateClientService = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClientService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-services'] })
    },
  })
}

export const useUpdateClientService = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClientService,
    onSuccess: (clientService) => {
      queryClient.invalidateQueries({ queryKey: ['client-services'] })
      if (clientService?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(clientService.id) })
      }
    },
  })
}

export const useDeleteClientService = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClientService,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['client-services'] })
      if (id) {
        queryClient.removeQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}
