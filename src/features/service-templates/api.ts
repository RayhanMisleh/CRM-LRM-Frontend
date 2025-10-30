import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import { createApiClient } from '@/lib/api'

const serviceTemplatesApi = createApiClient()

export type ServiceTemplateBillingCycle = 'monthly' | 'quarterly' | 'semester' | 'yearly' | string

export interface ServiceTemplate {
  id: string
  name: string
  category?: string | null
  description?: string | null
  baseMonthlyFee?: number | null
  setupFee?: number | null
  defaultBillingCycle?: ServiceTemplateBillingCycle | null
  deliverables?: string[] | null
  stack?: string[] | null
  tags?: string[] | null
  createdAt: string
  updatedAt?: string | null
}

export interface ServiceTemplateListResponse {
  data: ServiceTemplate[]
  meta?: {
    total?: number
    lastUpdatedAt?: string | null
  }
}

export interface ServiceTemplateListFilters {
  category?: string
  search?: string
  billingCycle?: string
  tags?: string[]
}

export type CreateServiceTemplateInput = {
  name: string
  category?: string | null
  description?: string | null
  baseMonthlyFee?: number | null
  setupFee?: number | null
  defaultBillingCycle?: ServiceTemplateBillingCycle | null
  deliverables?: string[] | null
  stack?: string[] | null
  tags?: string[] | null
}

export type UpdateServiceTemplateInput = Partial<CreateServiceTemplateInput> & { id: string }

const queryKeys = {
  list: (filters: ServiceTemplateListFilters = {}): QueryKey => ['service-templates', 'list', filters],
  detail: (id: string): QueryKey => ['service-templates', 'detail', id],
} as const

const buildSearchParams = (filters: ServiceTemplateListFilters = {}) => {
  const params = new URLSearchParams()

  if (filters.category) {
    params.set('category', filters.category)
  }

  if (filters.search) {
    params.set('search', filters.search)
  }

  if (filters.billingCycle) {
    params.set('billingCycle', filters.billingCycle)
  }

  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag) => params.append('tags', tag))
  }

  return params
}

const fetchServiceTemplates = async (filters: ServiceTemplateListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await serviceTemplatesApi.get('service-templates', { searchParams })
  return (await response.json()) as ServiceTemplateListResponse
}

const fetchServiceTemplate = async (id: string) => {
  const response = await serviceTemplatesApi.get(`service-templates/${id}`)
  return (await response.json()) as ServiceTemplate
}

const createServiceTemplate = async (input: CreateServiceTemplateInput) => {
  const response = await serviceTemplatesApi.post('service-templates', { json: input })
  return (await response.json()) as ServiceTemplate
}

const updateServiceTemplate = async ({ id, ...input }: UpdateServiceTemplateInput) => {
  const response = await serviceTemplatesApi.put(`service-templates/${id}`, { json: input })
  return (await response.json()) as ServiceTemplate
}

const deleteServiceTemplate = async (id: string) => {
  await serviceTemplatesApi.delete(`service-templates/${id}`)
  return id
}

export const useServiceTemplates = (filters: ServiceTemplateListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      category: filters.category,
      search: filters.search,
      billingCycle: filters.billingCycle,
      tags: filters.tags,
    }),
    [filters.billingCycle, filters.category, filters.search, filters.tags],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchServiceTemplates(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useServiceTemplate = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchServiceTemplate(id),
    enabled: options?.enabled ?? true,
  })
}

export const useCreateServiceTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createServiceTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] })
    },
  })
}

export const useUpdateServiceTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateServiceTemplate,
    onSuccess: (serviceTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] })
      if (serviceTemplate?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(serviceTemplate.id) })
      }
    },
  })
}

export const useDeleteServiceTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteServiceTemplate,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] })
      if (id) {
        queryClient.removeQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}
