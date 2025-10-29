import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiClient } from '@/lib/api'

const plansApi = createApiClient()

export type PlanBillingCycle = 'monthly' | 'quarterly' | 'semester' | 'yearly' | string

export interface Plan {
  id: string
  name: string
  description?: string | null
  amount?: number | null
  currency?: string | null
  billingCycle?: PlanBillingCycle | null
  features?: string[] | null
  active?: boolean | null
  createdAt: string
  updatedAt?: string | null
}

export interface PlanListResponse {
  data: Plan[]
}

export type CreatePlanInput = {
  name: string
  description?: string | null
  amount?: number | null
  currency?: string | null
  billingCycle?: PlanBillingCycle | null
  features?: string[] | null
  active?: boolean | null
}

export type UpdatePlanInput = CreatePlanInput & { id: string }

const queryKeys = {
  list: ['plans', 'list'] as const,
  detail: (id: string) => ['plans', 'detail', id] as const,
}

const fetchPlans = async () => {
  const response = await plansApi.get('plans')
  return (await response.json()) as PlanListResponse
}

const createPlan = async (input: CreatePlanInput) => {
  const response = await plansApi.post('plans', { json: input })
  return (await response.json()) as Plan
}

const updatePlan = async ({ id, ...input }: UpdatePlanInput) => {
  const response = await plansApi.patch(`plans/${id}`, { json: input })
  return (await response.json()) as Plan
}

const deletePlan = async (id: string) => {
  await plansApi.delete(`plans/${id}`)
  return id
}

export const usePlans = () => {
  return useQuery({
    queryKey: queryKeys.list,
    queryFn: fetchPlans,
    placeholderData: keepPreviousData,
  })
}

export const useCreatePlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list })
    },
  })
}

export const useUpdatePlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePlan,
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list })
      if (plan?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(plan.id) })
      }
    },
  })
}

export const useDeletePlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePlan,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list })
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}
