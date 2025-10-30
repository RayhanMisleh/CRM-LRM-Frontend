import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const invoicesApi = createApiClient()

export type InvoiceStatus = 'draft' | 'pending' | 'overdue' | 'paid' | 'cancelled' | string

export interface InvoiceClientSummary {
  id: string
  companyName: string
  tradeName?: string | null
}

export interface InvoiceContractSummary {
  id: string
  title: string
}

export interface InvoiceServiceSummary {
  id: string
  name: string
  status?: string | null
  clientName?: string | null
}

export interface InvoiceBillingSummary {
  id: string
  cycle: string
  status?: string | null
}

export interface Invoice {
  id: string
  number?: string | null
  description?: string | null
  clientId: string
  client?: InvoiceClientSummary | null
  contractId?: string | null
  contract?: InvoiceContractSummary | null
  clientServiceId?: string | null
  clientService?: InvoiceServiceSummary | null
  serviceBillingId?: string | null
  serviceBilling?: InvoiceBillingSummary | null
  amount?: number | null
  currency?: string | null
  issueDate?: string | null
  dueDate?: string | null
  status: InvoiceStatus
  paidAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface InvoiceListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface InvoiceListResponse {
  data: Invoice[]
  meta?: InvoiceListMeta
}

export interface InvoiceListFilters {
  page?: number
  pageSize?: number
  status?: string
  clientId?: string
  clientServiceId?: string
  serviceBillingId?: string
  dueIn?: string | number
  period?: string | number
  search?: string
}

export type CreateInvoiceInput = {
  clientId: string
  contractId?: string | null
  clientServiceId?: string | null
  serviceBillingId?: string | null
  number?: string | null
  description?: string | null
  amount: number
  currency?: string | null
  issueDate: string
  dueDate: string
  status?: InvoiceStatus
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput> & { id: string }

export type UpdateInvoiceStatusInput = {
  id: string
  status: InvoiceStatus
  paidAt?: string | null
}

const queryKeys = {
  list: (filters: InvoiceListFilters = {}) =>
    [
      'invoices',
      'list',
      filters.page ?? null,
      filters.pageSize ?? null,
      filters.status ?? null,
      filters.clientId ?? null,
      filters.clientServiceId ?? null,
      filters.serviceBillingId ?? null,
      filters.dueIn ?? null,
      filters.period ?? null,
      filters.search ?? null,
    ] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
}

const buildSearchParams = (filters: InvoiceListFilters = {}) => {
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

  if (filters.clientServiceId) {
    params.set('clientServiceId', filters.clientServiceId)
  }

  if (filters.serviceBillingId) {
    params.set('serviceBillingId', filters.serviceBillingId)
  }

  if (filters.dueIn !== undefined && filters.dueIn !== null && `${filters.dueIn}` !== '') {
    params.set('dueIn', String(filters.dueIn))
  }

  if (filters.period !== undefined && filters.period !== null && `${filters.period}` !== '') {
    params.set('period', String(filters.period))
  }

  if (filters.search) {
    params.set('search', filters.search)
  }

  return params
}

const fetchInvoices = async (filters: InvoiceListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await invoicesApi.get('invoices', {
    searchParams,
  })

  return (await response.json()) as InvoiceListResponse
}

const createInvoice = async (input: CreateInvoiceInput) => {
  const response = await invoicesApi.post('invoices', { json: input })
  return (await response.json()) as Invoice
}

const updateInvoice = async ({ id, ...input }: UpdateInvoiceInput) => {
  const response = await invoicesApi.put(`invoices/${id}`, { json: input })
  return (await response.json()) as Invoice
}

const updateInvoiceStatus = async ({ id, status, paidAt }: UpdateInvoiceStatusInput) => {
  const response = await invoicesApi.patch(`invoices/${id}/status`, {
    json: { status, paidAt },
  })

  return (await response.json()) as Invoice
}

export const useInvoices = (filters: InvoiceListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      clientId: filters.clientId,
      clientServiceId: filters.clientServiceId,
      serviceBillingId: filters.serviceBillingId,
      dueIn: filters.dueIn,
      period: filters.period,
      search: filters.search,
    }),
    [
      filters.clientId,
      filters.clientServiceId,
      filters.serviceBillingId,
      filters.dueIn,
      filters.page,
      filters.pageSize,
      filters.period,
      filters.search,
      filters.status,
    ],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchInvoices(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateInvoice = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateInvoice,
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (invoice?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(invoice.id) })
      }
    },
  })
}

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateInvoiceStatus,
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (invoice?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(invoice.id) })
      }
    },
  })
}

export type { ApiHttpError }
