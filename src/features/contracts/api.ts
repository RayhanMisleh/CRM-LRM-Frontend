import { useMemo } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const contractsApi = createApiClient()

export interface ContractClientSummary {
  id: string
  companyName: string
  tradeName?: string | null
}

export interface Contract {
  id: string
  clientId: string
  client?: ContractClientSummary | null
  title: string
  status: 'draft' | 'pending' | 'active' | 'closed' | 'cancelled' | string
  signedAt?: string | null
  validUntil?: string | null
  totalValue?: number | null
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | string | null
  arquivoPdfUrl?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ContractListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ContractListResponse {
  data: Contract[]
  meta?: ContractListMeta
}

export interface ContractListFilters {
  page?: number
  pageSize?: number
  status?: string
  clientId?: string
  startDate?: string
  endDate?: string
}

export type CreateContractInput = {
  clientId: string
  title: string
  status: Contract['status']
  signedAt?: string | null
  validUntil?: string | null
  totalValue?: number | null
  billingCycle?: Contract['billingCycle']
  arquivoPdfUrl?: string | null
}

export type UpdateContractInput = Partial<CreateContractInput> & { id: string }

export interface UploadContractFileResult {
  url: string
}

const queryKeys = {
  list: (filters: ContractListFilters = {}) => [
    'contracts',
    'list',
    filters.page ?? null,
    filters.pageSize ?? null,
    filters.status ?? null,
    filters.clientId ?? null,
    filters.startDate ?? null,
    filters.endDate ?? null,
  ] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
}

const buildSearchParams = (filters: ContractListFilters = {}) => {
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

  if (filters.startDate) {
    params.set('startDate', filters.startDate)
  }

  if (filters.endDate) {
    params.set('endDate', filters.endDate)
  }

  return params
}

const fetchContracts = async (filters: ContractListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await contractsApi.get('contracts', {
    searchParams,
  })

  return (await response.json()) as ContractListResponse
}

const createContract = async (input: CreateContractInput) => {
  const response = await contractsApi.post('contracts', { json: input })
  return (await response.json()) as Contract
}

const updateContract = async ({ id, ...input }: UpdateContractInput) => {
  const response = await contractsApi.put(`contracts/${id}`, { json: input })
  return (await response.json()) as Contract
}

const uploadContractFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await contractsApi.post('contracts/upload', {
    body: formData,
  })

  return (await response.json()) as UploadContractFileResult
}

export const useContracts = (filters: ContractListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      clientId: filters.clientId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    [
      filters.clientId,
      filters.endDate,
      filters.page,
      filters.pageSize,
      filters.startDate,
      filters.status,
    ],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchContracts(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateContract = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

export const useUpdateContract = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateContract,
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      if (contract?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(contract.id) })
      }
    },
  })
}

export const useUploadContractFile = () => {
  return useMutation({
    mutationFn: uploadContractFile,
  })
}

export type { ApiHttpError }
