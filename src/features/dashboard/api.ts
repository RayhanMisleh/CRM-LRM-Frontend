import { useMemo } from 'react'
import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const dashboardApi = createApiClient()

export interface InvoiceStatsFilters {
  status?: string
  dueInDays?: number
}

export interface InvoiceStatusSummary {
  status: string
  label: string
  totalInvoices: number
  totalAmount: number
  trendPercentage?: number | null
}

export interface InvoiceStatsResponse {
  currency: string
  updatedAt?: string
  summaries: InvoiceStatusSummary[]
}

export interface DomainExpirationsFilters {
  status?: string
  dueInHours?: number
}

export interface DomainExpiration {
  id: string
  domain: string
  clientName: string
  expiresAt: string
  daysLeft: number
  status: 'expired' | 'expiring' | 'active' | string
}

export interface UpcomingMeetingsFilters {
  status?: string
  withinHours?: number
}

export interface UpcomingMeeting {
  id: string
  title: string
  scheduledFor: string
  with: string
  channel: string
  status: 'confirmed' | 'pending' | 'canceled' | string
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
  invoiceStats: (filters: InvoiceStatsFilters = {}): QueryKey => ['dashboard', 'invoice-stats', filters],
  domainExpirations: (filters: DomainExpirationsFilters = {}): QueryKey => [
    'dashboard',
    'domain-expirations',
    filters,
  ],
  upcomingMeetings: (filters: UpcomingMeetingsFilters = {}): QueryKey => ['dashboard', 'upcoming-meetings', filters],
} as const

const isApiHttpError = (error: unknown): error is ApiHttpError =>
  typeof error === 'object' && error !== null && 'status' in error

const fetchInvoiceStats = async (filters: InvoiceStatsFilters = {}) => {
  const searchParams = buildSearchParams({ status: filters.status, dueIn: filters.dueInDays })

  try {
    const response = await dashboardApi.get('dashboard/invoices/stats', { searchParams })
    return (await response.json()) as InvoiceStatsResponse
  } catch (error) {
    if (isApiHttpError(error) && error.status === 404) {
      return { currency: 'BRL', summaries: [] }
    }

    throw error
  }
}

const fetchDomainExpirations = async (filters: DomainExpirationsFilters = {}) => {
  const searchParams = buildSearchParams({ status: filters.status, dueInHours: filters.dueInHours })

  try {
    const response = await dashboardApi.get('dashboard/domains/expirations', { searchParams })
    return (await response.json()) as DomainExpiration[]
  } catch (error) {
    if (isApiHttpError(error) && error.status === 404) {
      return []
    }

    throw error
  }
}

const fetchUpcomingMeetings = async (filters: UpcomingMeetingsFilters = {}) => {
  const searchParams = buildSearchParams({ status: filters.status, withinHours: filters.withinHours })

  try {
    const response = await dashboardApi.get('dashboard/meetings/upcoming', { searchParams })
    return (await response.json()) as UpcomingMeeting[]
  } catch (error) {
    if (isApiHttpError(error) && error.status === 404) {
      return []
    }

    throw error
  }
}

export const useInvoiceStats = (filters: InvoiceStatsFilters = {}) => {
  const memoFilters = useMemo(
    () => ({ status: filters.status, dueInDays: filters.dueInDays }),
    [filters.status, filters.dueInDays],
  )

  return useQuery({
    queryKey: queryKeys.invoiceStats(memoFilters),
    queryFn: () => fetchInvoiceStats(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useDomainExpirations = (filters: DomainExpirationsFilters = {}) => {
  const memoFilters = useMemo(
    () => ({ status: filters.status, dueInHours: filters.dueInHours }),
    [filters.status, filters.dueInHours],
  )

  return useQuery({
    queryKey: queryKeys.domainExpirations(memoFilters),
    queryFn: () => fetchDomainExpirations(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useUpcomingMeetings = (filters: UpcomingMeetingsFilters = {}) => {
  const memoFilters = useMemo(
    () => ({ status: filters.status, withinHours: filters.withinHours }),
    [filters.status, filters.withinHours],
  )

  return useQuery({
    queryKey: queryKeys.upcomingMeetings(memoFilters),
    queryFn: () => fetchUpcomingMeetings(memoFilters),
    placeholderData: keepPreviousData,
  })
}
