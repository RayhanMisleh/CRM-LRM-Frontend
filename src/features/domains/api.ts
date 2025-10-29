import { useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const domainsApi = createApiClient()

export interface DomainClientSummary {
  id: string
  companyName?: string | null
  tradeName?: string | null
}

export interface DomainPayload {
  id: string
  clientId: string
  client?: DomainClientSummary | null
  host: string
  provider?: string | null
  status: 'active' | 'expiring' | 'expired' | string
  expiresAt?: string | null
  autoRenew?: boolean | null
  reminderDays?: number[] | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface Domain extends DomainPayload {
  daysUntilExpiration: number | null
}

export interface DomainListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface DomainListResponse {
  data: DomainPayload[]
  meta?: DomainListMeta
}

export interface DomainListFilters {
  page?: number
  pageSize?: number
  status?: string
  clientId?: string
  dueIn?: number
}

export interface CreateDomainInput {
  clientId: string
  host: string
  provider?: string
  status: string
  expiresAt?: string
  autoRenew?: boolean
  reminderDays?: number[]
  notes?: string
}

export interface UpdateDomainInput extends CreateDomainInput {
  id: string
}

const queryKeys = {
  list: (filters: DomainListFilters = {}) =>
    [
      'domains',
      'list',
      filters.page ?? null,
      filters.pageSize ?? null,
      filters.status ?? null,
      filters.clientId ?? null,
      filters.dueIn ?? null,
    ] as const,
  detail: (id: string) => ['domains', 'detail', id] as const,
}

const computeDaysUntilExpiration = (value?: string | null): number | null => {
  if (!value) return null
  const expiration = new Date(value)
  if (Number.isNaN(expiration.getTime())) return null

  try {
    return differenceInDays(expiration, new Date())
  } catch {
    return null
  }
}

const enhanceDomain = (domain: DomainPayload): Domain => ({
  ...domain,
  daysUntilExpiration: computeDaysUntilExpiration(domain.expiresAt),
})

const buildSearchParams = (filters: DomainListFilters = {}) => {
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

  if (typeof filters.dueIn === 'number' && Number.isFinite(filters.dueIn)) {
    params.set('dueIn', String(filters.dueIn))
  }

  return params
}

const fetchDomains = async (filters: DomainListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await domainsApi.get('domains', { searchParams })
  const payload = (await response.json()) as DomainListResponse

  return {
    ...payload,
    data: payload.data.map((domain) => enhanceDomain(domain)),
  }
}

const fetchDomain = async (id: string) => {
  const response = await domainsApi.get(`domains/${id}`)
  const payload = (await response.json()) as DomainPayload

  return enhanceDomain(payload)
}

const createDomain = async (input: CreateDomainInput) => {
  const response = await domainsApi.post('domains', { json: input })
  const payload = (await response.json()) as DomainPayload

  return enhanceDomain(payload)
}

const updateDomain = async ({ id, ...input }: UpdateDomainInput) => {
  const response = await domainsApi.put(`domains/${id}`, { json: input })
  const payload = (await response.json()) as DomainPayload

  return enhanceDomain(payload)
}

const deleteDomain = async (id: string) => {
  await domainsApi.delete(`domains/${id}`)
  return id
}

export const useDomains = (filters: DomainListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      clientId: filters.clientId,
      dueIn: filters.dueIn,
    }),
    [filters.clientId, filters.dueIn, filters.page, filters.pageSize, filters.status],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchDomains(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useDomain = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchDomain(id),
    enabled: options?.enabled ?? true,
  })
}

export const useCreateDomain = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
    },
  })
}

export const useUpdateDomain = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDomain,
    onSuccess: (domain) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      if (domain?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(domain.id) })
      }
    },
  })
}

export const useDeleteDomain = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDomain,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      if (id) {
        queryClient.removeQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}

export type { ApiHttpError }
