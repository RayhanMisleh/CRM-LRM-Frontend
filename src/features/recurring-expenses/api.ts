import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const recurringExpensesApi = createApiClient()

export type RecurringExpenseStatus = 'active' | 'paused' | 'cancelled' | string
export type RecurringExpenseFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | string

export interface RecurringExpense {
  id: string
  title: string
  description?: string | null
  type?: string | null
  status?: RecurringExpenseStatus | null
  amount?: number | null
  currency?: string | null
  costCenter?: string | null
  frequency?: RecurringExpenseFrequency | null
  nextDueDate?: string | null
  lastGeneratedAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface RecurringExpenseListMeta {
  page?: number
  pageSize?: number
  totalItems?: number
  totalPages?: number
  totalAmount?: number
}

export interface RecurringExpenseListResponse {
  data: RecurringExpense[]
  meta?: RecurringExpenseListMeta
}

export interface RecurringExpenseFilters {
  type?: string
  status?: string
  costCenter?: string
  dueIn?: string
  page?: number
  pageSize?: number
}

export interface CreateRecurringExpenseInput {
  title: string
  description?: string | null
  type?: string | null
  status?: RecurringExpenseStatus | null
  amount: number
  currency?: string | null
  costCenter?: string | null
  frequency: RecurringExpenseFrequency
  firstDueDate?: string | null
  notes?: string | null
}

export interface UpdateRecurringExpenseInput extends Partial<CreateRecurringExpenseInput> {
  id: string
}

export interface GenerateManualExpenseInput {
  id: string
}

const queryKeys = {
  list: (filters: RecurringExpenseFilters = {}) =>
    [
      'recurring-expenses',
      'list',
      filters.page ?? null,
      filters.pageSize ?? null,
      filters.type ?? null,
      filters.status ?? null,
      filters.costCenter ?? null,
      filters.dueIn ?? null,
    ] as const,
  detail: (id: string) => ['recurring-expenses', 'detail', id] as const,
}

const buildSearchParams = (filters: RecurringExpenseFilters = {}) => {
  const params = new URLSearchParams()

  if (filters.page) {
    params.set('page', String(filters.page))
  }

  if (filters.pageSize) {
    params.set('pageSize', String(filters.pageSize))
  }

  if (filters.type) {
    params.set('type', filters.type)
  }

  if (filters.status) {
    params.set('status', filters.status)
  }

  if (filters.costCenter) {
    params.set('costCenter', filters.costCenter)
  }

  if (filters.dueIn) {
    params.set('dueIn', filters.dueIn)
  }

  return params
}

const fetchRecurringExpenses = async (filters: RecurringExpenseFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await recurringExpensesApi.get('recurring-expenses', { searchParams })
  return (await response.json()) as RecurringExpenseListResponse
}

const createRecurringExpense = async (input: CreateRecurringExpenseInput) => {
  const response = await recurringExpensesApi.post('recurring-expenses', { json: input })
  return (await response.json()) as RecurringExpense
}

const updateRecurringExpense = async ({ id, ...input }: UpdateRecurringExpenseInput) => {
  const response = await recurringExpensesApi.put(`recurring-expenses/${id}`, { json: input })
  return (await response.json()) as RecurringExpense
}

const generateManualExpense = async ({ id }: GenerateManualExpenseInput) => {
  const response = await recurringExpensesApi.post(`recurring-expenses/${id}/generate`, {})
  return (await response.json()) as { success: boolean }
}

export const useRecurringExpenses = (filters: RecurringExpenseFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      type: filters.type,
      status: filters.status,
      costCenter: filters.costCenter,
      dueIn: filters.dueIn,
    }),
    [filters.costCenter, filters.dueIn, filters.page, filters.pageSize, filters.status, filters.type],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchRecurringExpenses(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateRecurringExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecurringExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] })
    },
  })
}

export const useUpdateRecurringExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecurringExpense,
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] })
      if (expense?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(expense.id) })
      }
    },
  })
}

export const useGenerateRecurringExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateManualExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export type { ApiHttpError }
