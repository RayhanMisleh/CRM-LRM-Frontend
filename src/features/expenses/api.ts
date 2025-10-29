import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const expensesApi = createApiClient()

export type ExpenseStatus = 'pending' | 'paid' | 'overdue' | 'scheduled' | string
export type ExpenseType = 'service' | 'product' | 'payroll' | 'tax' | 'fee' | string

export interface Expense {
  id: string
  title: string
  description?: string | null
  type?: ExpenseType | null
  status?: ExpenseStatus | null
  amount?: number | null
  currency?: string | null
  dueDate?: string | null
  paidAt?: string | null
  costCenter?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface ExpenseListMeta {
  page?: number
  pageSize?: number
  totalItems?: number
  totalPages?: number
  totalAmount?: number
  totalPendingAmount?: number
  totalOverdueAmount?: number
}

export interface ExpenseListResponse {
  data: Expense[]
  meta?: ExpenseListMeta
}

export interface ExpenseListFilters {
  type?: string
  status?: string
  costCenter?: string
  dueIn?: string
  page?: number
  pageSize?: number
}

export interface CreateExpenseInput {
  title: string
  description?: string | null
  type?: ExpenseType | null
  status?: ExpenseStatus | null
  amount: number
  currency?: string | null
  dueDate?: string | null
  costCenter?: string | null
  notes?: string | null
}

export type UpdateExpenseInput = Partial<CreateExpenseInput> & { id: string }

const queryKeys = {
  list: (filters: ExpenseListFilters = {}) =>
    [
      'expenses',
      'list',
      filters.page ?? null,
      filters.pageSize ?? null,
      filters.type ?? null,
      filters.status ?? null,
      filters.costCenter ?? null,
      filters.dueIn ?? null,
    ] as const,
  detail: (id: string) => ['expenses', 'detail', id] as const,
}

const buildSearchParams = (filters: ExpenseListFilters = {}) => {
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

const fetchExpenses = async (filters: ExpenseListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await expensesApi.get('expenses', { searchParams })
  return (await response.json()) as ExpenseListResponse
}

const createExpense = async (input: CreateExpenseInput) => {
  const response = await expensesApi.post('expenses', { json: input })
  return (await response.json()) as Expense
}

const updateExpense = async ({ id, ...input }: UpdateExpenseInput) => {
  const response = await expensesApi.put(`expenses/${id}`, { json: input })
  return (await response.json()) as Expense
}

export const useExpenses = (filters: ExpenseListFilters = {}) => {
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
    queryFn: () => fetchExpenses(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export const useUpdateExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExpense,
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      if (expense?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(expense.id) })
      }
    },
  })
}

export type { ApiHttpError }
