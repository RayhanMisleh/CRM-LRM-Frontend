import { cache, useMemo } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
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

export interface ClientResponsible {
  name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
}

export interface Client {
  id: string
  companyName: string
  tradeName?: string | null
  cnpj?: string | null
  email?: string | null
  phone?: string | null
  status: ClientStatus
  segment?: string | null
  tags?: string[]
  notes?: string | null
  responsible?: ClientResponsible | null
  lastInteractionAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

type ApiClientStatus = 'LEAD' | 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

interface ApiClient {
  id: string
  empresaId?: string | null
  externalId?: string | null
  name: string
  email?: string | null
  phone?: string | null
  status: ApiClientStatus
  tags?: string[]
  notes?: string | null
  meta?: Record<string, unknown> | null
  createdAt: string
  updatedAt?: string | null
}

interface ClientMeta {
  tradeName?: string | null
  segment?: string | null
  responsible?: ClientResponsible | null
  document?: string | null
  lastInteractionAt?: string | null
}

export interface ClientContact {
  id: string
  clientId: string
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ClientContract {
  id: string
  clientId: string
  title: string
  status: 'draft' | 'pending' | 'active' | 'closed' | 'cancelled' | string
  signedAt?: string | null
  validUntil?: string | null
  totalValue?: number | null
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | string | null
  clientServiceId?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ClientDomain {
  id: string
  clientId: string
  host: string
  provider?: string | null
  status: 'active' | 'expiring' | 'expired' | string
  expiresAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ClientMeeting {
  id: string
  clientId: string
  subject: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed' | string
  scheduledAt: string
  durationMinutes?: number | null
  location?: string | null
  notes?: string | null
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

export interface PaginatedClientResource<T> {
  data: T[]
  meta?: ClientListMeta
}

export type CreateClientContactInput = {
  clientId: string
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
}

export type UpdateClientContactInput = Partial<Omit<CreateClientContactInput, 'clientId'>> & { id: string; clientId: string }

export type CreateClientContractInput = {
  clientId: string
  title: string
  status?: ClientContract['status']
  signedAt?: string | null
  validUntil?: string | null
  totalValue?: number | null
  billingCycle?: ClientContract['billingCycle']
}

export type UpdateClientContractInput = Partial<CreateClientContractInput> & { id: string; clientId: string }

export type CreateClientDomainInput = {
  clientId: string
  host: string
  provider?: string | null
  status?: ClientDomain['status']
  expiresAt?: string | null
}

export type UpdateClientDomainInput = Partial<CreateClientDomainInput> & { id: string; clientId: string }

export type CreateClientMeetingInput = {
  clientId: string
  subject: string
  status?: ClientMeeting['status']
  scheduledAt: string
  durationMinutes?: number | null
  location?: string | null
  notes?: string | null
}

export type UpdateClientMeetingInput = Partial<CreateClientMeetingInput> & { id: string; clientId: string }

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
  responsible?: ClientResponsible | null
}

export type UpdateClientInput = CreateClientInput & { id: string }
export type UpdateClientTagsInput = { id: string; tags: string[] }

const STATUS_TO_API: Record<string, ApiClientStatus> = {
  lead: 'LEAD',
  prospect: 'PROSPECT',
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  churned: 'ARCHIVED',
}

const STATUS_FROM_API: Record<ApiClientStatus, ClientStatus> = {
  LEAD: 'lead',
  PROSPECT: 'prospect',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'churned',
}

const normalizeOptionalString = (value?: string | null) => {
  if (value === undefined || value === null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const mapStatusToApi = (status?: ClientStatus): ApiClientStatus => {
  if (!status) return 'ACTIVE'
  const normalized = status.toString().toLowerCase()
  return STATUS_TO_API[normalized] ?? 'ACTIVE'
}

const mapStatusFromApi = (status: ApiClientStatus): ClientStatus => {
  return STATUS_FROM_API[status] ?? 'active'
}

const buildClientMetaPayload = (input: CreateClientInput): ClientMeta | undefined => {
  const meta: ClientMeta = {}

  if (input.tradeName) meta.tradeName = input.tradeName
  if (input.segment) meta.segment = input.segment
  if (input.responsible) meta.responsible = input.responsible
  if (input.cnpj) meta.document = input.cnpj

  return Object.keys(meta).length > 0 ? meta : undefined
}

const mapApiClientToClient = (client: ApiClient): Client => {
  const meta = (client.meta ?? {}) as ClientMeta

  return {
    id: client.id,
    companyName: client.name,
    tradeName: meta.tradeName ?? null,
    cnpj: meta.document ?? undefined,
    email: normalizeOptionalString(client.email),
    phone: normalizeOptionalString(client.phone),
    status: mapStatusFromApi(client.status),
    segment: meta.segment ?? null,
    tags: client.tags ?? [],
    notes: normalizeOptionalString(client.notes),
    responsible: meta.responsible ?? null,
    lastInteractionAt: meta.lastInteractionAt ?? null,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt ?? null,
  }
}

const mapClientInputToApiPayload = (input: CreateClientInput) => {
  const payload: Record<string, unknown> = {
    name: input.companyName,
    status: mapStatusToApi(input.status),
  }

  const document = normalizeOptionalString(input.cnpj)
  if (document) {
    payload.document = document
  }

  const email = normalizeOptionalString(input.email)
  if (email) {
    payload.email = email
  }

  const phone = normalizeOptionalString(input.phone)
  if (phone) {
    payload.phone = phone
  }

  const notes = normalizeOptionalString(input.notes)
  if (notes) {
    payload.notes = notes
  }

  if (input.tags && input.tags.length > 0) {
    payload.tags = input.tags
  }

  const meta = buildClientMetaPayload(input)
  if (meta) {
    payload.meta = meta
  }

  return payload
}

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
  contacts: (id: string): QueryKey => ['clients', 'detail', id, 'contacts'],
  contracts: (id: string): QueryKey => ['clients', 'detail', id, 'contracts'],
  services: (id: string): QueryKey => ['clients', 'detail', id, 'services'],
  domains: (id: string): QueryKey => ['clients', 'detail', id, 'domains'],
  meetings: (id: string): QueryKey => ['clients', 'detail', id, 'meetings'],
} as const

const fetchClient = async (id: string) => {
  const response = await clientsApi.get(`clients/${id}`)
  const json = (await response.json()) as { data?: ApiClient }
  if (!json?.data) {
    throw new Error('Resposta inesperada ao carregar cliente.')
  }
  return mapApiClientToClient(json.data)
}

export const getClient = cache(async (id: string) => {
  return await fetchClient(id)
})

const fetchClients = async (filters: ClientListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await clientsApi.get('clients', { searchParams })
  const json = (await response.json()) as { data?: ApiClient[]; meta: ClientListMeta }

  return {
    data: (json.data ?? []).map(mapApiClientToClient),
    meta: json.meta,
  }
}

const createClient = async (input: CreateClientInput) => {
  const payload = mapClientInputToApiPayload(input)
  const response = await clientsApi.post('clients', { json: payload })
  const json = (await response.json()) as { data?: ApiClient }
  if (!json?.data) {
    throw new Error('Resposta inesperada ao criar cliente.')
  }
  return mapApiClientToClient(json.data)
}

const updateClient = async ({ id, ...input }: UpdateClientInput) => {
  const payload = mapClientInputToApiPayload(input)
  const response = await clientsApi.put(`clients/${id}`, { json: payload })
  const json = (await response.json()) as { data?: ApiClient }
  if (!json?.data) {
    throw new Error('Resposta inesperada ao atualizar cliente.')
  }
  return mapApiClientToClient(json.data)
}

const updateClientTags = async ({ id, tags }: UpdateClientTagsInput) => {
  const response = await clientsApi.patch(`clients/${id}`, { json: { tags } })
  const json = (await response.json()) as { data?: ApiClient }
  if (!json?.data) {
    throw new Error('Resposta inesperada ao atualizar tags.')
  }
  return mapApiClientToClient(json.data)
}

const deleteClient = async (id: string) => {
  await clientsApi.delete(`clients/${id}`)
  return id
}

const fetchClientContacts = async (clientId: string) => {
  const response = await clientsApi.get(`clients/${clientId}/contacts`)
  return (await response.json()) as PaginatedClientResource<ClientContact>
}

const createClientContact = async (input: CreateClientContactInput) => {
  const response = await clientsApi.post(`clients/${input.clientId}/contacts`, { json: input })
  return (await response.json()) as ClientContact
}

const updateClientContact = async ({ id, clientId, ...input }: UpdateClientContactInput) => {
  const response = await clientsApi.put(`clients/${clientId}/contacts/${id}`, { json: input })
  return (await response.json()) as ClientContact
}

const deleteClientContact = async ({ clientId, id }: { clientId: string; id: string }) => {
  await clientsApi.delete(`clients/${clientId}/contacts/${id}`)
  return id
}

const fetchClientContracts = async (clientId: string) => {
  const response = await clientsApi.get(`clients/${clientId}/contracts`)
  return (await response.json()) as PaginatedClientResource<ClientContract>
}

const createClientContract = async (input: CreateClientContractInput) => {
  const response = await clientsApi.post(`clients/${input.clientId}/contracts`, { json: input })
  return (await response.json()) as ClientContract
}

const updateClientContract = async ({ id, clientId, ...input }: UpdateClientContractInput) => {
  const response = await clientsApi.put(`clients/${clientId}/contracts/${id}`, { json: input })
  return (await response.json()) as ClientContract
}

const deleteClientContract = async ({ clientId, id }: { clientId: string; id: string }) => {
  await clientsApi.delete(`clients/${clientId}/contracts/${id}`)
  return id
}

const fetchClientDomains = async (clientId: string) => {
  const response = await clientsApi.get(`clients/${clientId}/domains`)
  return (await response.json()) as PaginatedClientResource<ClientDomain>
}

const createClientDomain = async (input: CreateClientDomainInput) => {
  const response = await clientsApi.post(`clients/${input.clientId}/domains`, { json: input })
  return (await response.json()) as ClientDomain
}

const updateClientDomain = async ({ id, clientId, ...input }: UpdateClientDomainInput) => {
  const response = await clientsApi.put(`clients/${clientId}/domains/${id}`, { json: input })
  return (await response.json()) as ClientDomain
}

const deleteClientDomain = async ({ clientId, id }: { clientId: string; id: string }) => {
  await clientsApi.delete(`clients/${clientId}/domains/${id}`)
  return id
}

const fetchClientMeetings = async (clientId: string) => {
  const response = await clientsApi.get(`clients/${clientId}/meetings`)
  return (await response.json()) as PaginatedClientResource<ClientMeeting>
}

const createClientMeeting = async (input: CreateClientMeetingInput) => {
  const response = await clientsApi.post(`clients/${input.clientId}/meetings`, { json: input })
  return (await response.json()) as ClientMeeting
}

const updateClientMeeting = async ({ id, clientId, ...input }: UpdateClientMeetingInput) => {
  const response = await clientsApi.put(`clients/${clientId}/meetings/${id}`, { json: input })
  return (await response.json()) as ClientMeeting
}

const deleteClientMeeting = async ({ clientId, id }: { clientId: string; id: string }) => {
  await clientsApi.delete(`clients/${clientId}/meetings/${id}`)
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

export const useClient = (id: string, initialData?: Client) => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchClient(id),
    initialData,
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

export const useUpdateClient = <TContext = unknown>(
  options?: UseMutationOptions<Client, unknown, UpdateClientInput, TContext>,
): UseMutationResult<Client, unknown, UpdateClientInput, TContext> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClient,
    ...options,
    onSuccess: (client, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      if (client?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(client.id) })
      }
      options?.onSuccess?.(client, variables, context)
    },
  })
}

export const useUpdateClientTags = <TContext = unknown>(
  options?: UseMutationOptions<Client, unknown, UpdateClientTagsInput, TContext>,
): UseMutationResult<Client, unknown, UpdateClientTagsInput, TContext> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClientTags,
    ...options,
    onSuccess: (client, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      if (client?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(client.id) })
      }
      options?.onSuccess?.(client, variables, context)
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

const buildInvalidateDetail = (queryClient: ReturnType<typeof useQueryClient>, clientId: string, key: QueryKey) => {
  queryClient.invalidateQueries({ queryKey: key })
  queryClient.invalidateQueries({ queryKey: queryKeys.detail(clientId) })
}

export const useClientContacts = (clientId: string) => {
  return useQuery({
    queryKey: queryKeys.contacts(clientId),
    queryFn: () => fetchClientContacts(clientId),
  })
}

export const useCreateClientContact = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClientContact,
    onSuccess: (contact) => {
      buildInvalidateDetail(queryClient, contact.clientId, queryKeys.contacts(contact.clientId))
    },
  })
}

export const useUpdateClientContact = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClientContact,
    onSuccess: (contact) => {
      buildInvalidateDetail(queryClient, contact.clientId, queryKeys.contacts(contact.clientId))
    },
  })
}

export const useDeleteClientContact = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClientContact,
    onSuccess: (_, variables) => {
      buildInvalidateDetail(queryClient, variables.clientId, queryKeys.contacts(variables.clientId))
    },
  })
}

export const useClientContracts = (clientId: string) => {
  return useQuery({
    queryKey: queryKeys.contracts(clientId),
    queryFn: () => fetchClientContracts(clientId),
  })
}

export const useCreateClientContract = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClientContract,
    onSuccess: (contract) => {
      buildInvalidateDetail(queryClient, contract.clientId, queryKeys.contracts(contract.clientId))
    },
  })
}

export const useUpdateClientContract = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClientContract,
    onSuccess: (contract) => {
      buildInvalidateDetail(queryClient, contract.clientId, queryKeys.contracts(contract.clientId))
    },
  })
}

export const useDeleteClientContract = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClientContract,
    onSuccess: (_, variables) => {
      buildInvalidateDetail(queryClient, variables.clientId, queryKeys.contracts(variables.clientId))
    },
  })
}

export const useClientDomains = (clientId: string) => {
  return useQuery({
    queryKey: queryKeys.domains(clientId),
    queryFn: () => fetchClientDomains(clientId),
  })
}

export const useCreateClientDomain = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClientDomain,
    onSuccess: (domain) => {
      buildInvalidateDetail(queryClient, domain.clientId, queryKeys.domains(domain.clientId))
    },
  })
}

export const useUpdateClientDomain = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClientDomain,
    onSuccess: (domain) => {
      buildInvalidateDetail(queryClient, domain.clientId, queryKeys.domains(domain.clientId))
    },
  })
}

export const useDeleteClientDomain = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClientDomain,
    onSuccess: (_, variables) => {
      buildInvalidateDetail(queryClient, variables.clientId, queryKeys.domains(variables.clientId))
    },
  })
}

export const useClientMeetings = (clientId: string) => {
  return useQuery({
    queryKey: queryKeys.meetings(clientId),
    queryFn: () => fetchClientMeetings(clientId),
  })
}

export const useCreateClientMeeting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClientMeeting,
    onSuccess: (meeting) => {
      buildInvalidateDetail(queryClient, meeting.clientId, queryKeys.meetings(meeting.clientId))
    },
  })
}

export const useUpdateClientMeeting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClientMeeting,
    onSuccess: (meeting) => {
      buildInvalidateDetail(queryClient, meeting.clientId, queryKeys.meetings(meeting.clientId))
    },
  })
}

export const useDeleteClientMeeting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClientMeeting,
    onSuccess: (_, variables) => {
      buildInvalidateDetail(queryClient, variables.clientId, queryKeys.meetings(variables.clientId))
    },
  })
}
