import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import { createApiClient } from '@/lib/api'

const clientServicesApi = createApiClient()

export type ClientServiceStatus = 'draft' | 'active' | 'paused' | 'suspended' | 'terminated' | 'archived' | string
export type ClientServiceSupportLevel = 'basic' | 'standard' | 'premium' | 'enterprise' | string
export type ClientServiceBillingCycle = 'monthly' | 'bimonthly' | 'quarterly' | 'semester' | 'yearly' | string

export interface ClientServiceResponsible {
  name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
}

export interface ClientServiceTemplateSummary {
  id: string
  name: string
  category?: string | null
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
  templateId?: string | null
  contractId?: string | null
  status: ClientServiceStatus
  responsible?: ClientServiceResponsible | null
  hostingProvider?: string | null
  repositoryUrls?: string[] | null
  environmentLinks?: Record<string, string> | null
  defaultMonthlyFee?: number | null
  billingCycle?: ClientServiceBillingCycle | null
  supportLevel?: ClientServiceSupportLevel | null
  startDate?: string | null
  goLiveDate?: string | null
  endDate?: string | null
  tags?: string[] | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
  template?: ClientServiceTemplateSummary | null
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
  templateId?: string
  contractId?: string
  startDate?: string
  endDate?: string
  billingCycle?: string
  supportLevel?: string
  tags?: string[]
  search?: string
}

export type CreateClientServiceInput = {
  clientId: string
  templateId?: string | null
  contractId?: string | null
  status?: ClientServiceStatus
  responsible?: ClientServiceResponsible | null
  hostingProvider?: string | null
  repositoryUrls?: string[] | null
  environmentLinks?: Record<string, string> | null
  defaultMonthlyFee?: number | null
  billingCycle?: ClientServiceBillingCycle | null
  supportLevel?: ClientServiceSupportLevel | null
  startDate?: string | null
  goLiveDate?: string | null
  endDate?: string | null
  tags?: string[] | null
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
    ['templateId', (value) => Boolean(value)],
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

  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag) => params.append('tags', tag))
  }

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
      templateId: filters.templateId,
      contractId: filters.contractId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      billingCycle: filters.billingCycle,
      supportLevel: filters.supportLevel,
      tags: filters.tags,
      search: filters.search,
    }),
    [
      filters.billingCycle,
      filters.clientId,
      filters.contractId,
      filters.endDate,
      filters.page,
      filters.pageSize,
      filters.search,
      filters.startDate,
      filters.status,
      filters.supportLevel,
      filters.tags,
      filters.templateId,
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
