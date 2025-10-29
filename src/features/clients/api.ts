import { useMemo } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'

import { createApiClient } from '@/lib/api'

const clientsApi = createApiClient()

export type ClientStatus =
  | 'lead'
  | 'prospect'
  | 'active'
  | 'inactive'
  | 'churned'
  | string

export interface ClientContact {
  name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
}

export interface Client {
  id: string
  companyName: string
  tradeName?: string | null
  cnpj: string
  email?: string | null
  phone?: string | null
  status: ClientStatus
  segment?: string | null
  tags?: string[]
  notes?: string | null
  responsible?: ClientContact | null
  lastInteractionAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ClientListFilters {
  page?: number
  pageSize?: number
  orderBy?: string
  status?: string
  search?: string
  tags?: string[]
}

export interface ClientListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ClientListResponse {
  data: Client[]
  meta: ClientListMeta
}

export type CreateClientInput = {
  companyName: string
  tradeName?: string | null
  cnpj: string
  email?: string | null
  phone?: string | null
  status?: ClientStatus
  segment?: string | null
  tags?: string[]
  notes?: string | null
  responsible?: ClientContact | null
}

export type UpdateClientInput = CreateClientInput & { id: string }

const buildSearchParams = (filters: Record<string, unknown>) => {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          params.append(key, String(item))
        }
      })
      return
    }

    params.set(key, String(value))
  })

  return params
}

const queryKeys = {
  list: (filters: ClientListFilters = {}): QueryKey => ['clients', 'list', filters],
  detail: (id: string): QueryKey => ['clients', 'detail', id],
} as const

const fetchClients = async (filters: ClientListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await clientsApi.get('clients', { searchParams })
  return (await response.json()) as ClientListResponse
}

const createClient = async (input: CreateClientInput) => {
  const response = await clientsApi.post('clients', { json: input })
  return (await response.json()) as Client
}

const updateClient = async ({ id, ...input }: UpdateClientInput) => {
  const response = await clientsApi.put(`clients/${id}`, { json: input })
  return (await response.json()) as Client
}

const deleteClient = async (id: string) => {
  await clientsApi.delete(`clients/${id}`)
  return id
}

export const exportClients = async (filters: ClientListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await clientsApi.get('clients/export', {
    searchParams,
    headers: {
      Accept: 'text/csv, text/plain, */*',
    },
  })
  return await response.blob()
}

export const useClients = (filters: ClientListFilters = {}) => {
  const tagsKey = Array.isArray(filters.tags) ? filters.tags.join('|') : undefined

  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      orderBy: filters.orderBy,
      status: filters.status,
      search: filters.search,
      tags: filters.tags,
    }),
    [filters.orderBy, filters.page, filters.pageSize, filters.search, filters.status, tagsKey],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchClients(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export const useUpdateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClient,
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      if (client?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(client.id) })
      }
    },
  })
}

export const useDeleteClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClient,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}
