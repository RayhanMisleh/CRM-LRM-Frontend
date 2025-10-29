import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiClient, type ApiHttpError } from '@/lib/api'

const meetingsApi = createApiClient()

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed' | string

export interface Meeting {
  id: string
  clientId?: string | null
  clientName?: string | null
  subject: string
  status: MeetingStatus
  scheduledAt: string
  durationMinutes?: number | null
  location?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface MeetingListMeta {
  page?: number
  pageSize?: number
  totalItems?: number
  totalPages?: number
}

export interface MeetingListResponse {
  data: Meeting[]
  meta?: MeetingListMeta
}

export interface MeetingListFilters {
  clientId?: string
  status?: string
  nextHours?: number
  startDate?: string
  endDate?: string
  search?: string
}

export interface CreateMeetingInput {
  clientId: string
  subject: string
  scheduledAt: string
  status?: MeetingStatus
  durationMinutes?: number | null
  location?: string | null
  notes?: string | null
}

export type UpdateMeetingInput = Partial<CreateMeetingInput> & { id: string }

export type DeleteMeetingInput = { id: string }

const queryKeys = {
  list: (filters: MeetingListFilters = {}) =>
    [
      'meetings',
      'list',
      filters.clientId ?? null,
      filters.status ?? null,
      filters.nextHours ?? null,
      filters.startDate ?? null,
      filters.endDate ?? null,
      filters.search ?? null,
    ] as const,
  detail: (id: string) => ['meetings', 'detail', id] as const,
} as const

const buildSearchParams = (filters: MeetingListFilters = {}) => {
  const params = new URLSearchParams()

  if (filters.clientId) {
    params.set('clientId', filters.clientId)
  }

  if (filters.status) {
    params.set('status', filters.status)
  }

  if (typeof filters.nextHours === 'number') {
    params.set('nextHours', String(filters.nextHours))
  }

  if (filters.startDate) {
    params.set('startDate', filters.startDate)
  }

  if (filters.endDate) {
    params.set('endDate', filters.endDate)
  }

  if (filters.search) {
    params.set('search', filters.search)
  }

  return params
}

const fetchMeetings = async (filters: MeetingListFilters = {}) => {
  const searchParams = buildSearchParams(filters)
  const response = await meetingsApi.get('meetings', { searchParams })
  return (await response.json()) as MeetingListResponse
}

const createMeeting = async (input: CreateMeetingInput) => {
  const response = await meetingsApi.post('meetings', { json: input })
  return (await response.json()) as Meeting
}

const updateMeeting = async ({ id, ...input }: UpdateMeetingInput) => {
  const response = await meetingsApi.put(`meetings/${id}`, { json: input })
  return (await response.json()) as Meeting
}

const deleteMeeting = async ({ id }: DeleteMeetingInput) => {
  await meetingsApi.delete(`meetings/${id}`)
  return id
}

export const useMeetings = (filters: MeetingListFilters = {}) => {
  const memoFilters = useMemo(
    () => ({
      clientId: filters.clientId,
      status: filters.status,
      nextHours: filters.nextHours,
      startDate: filters.startDate,
      endDate: filters.endDate,
      search: filters.search,
    }),
    [filters.clientId, filters.endDate, filters.nextHours, filters.search, filters.startDate, filters.status],
  )

  return useQuery({
    queryKey: queryKeys.list(memoFilters),
    queryFn: () => fetchMeetings(memoFilters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateMeeting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMeeting,
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      if (meeting?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(meeting.id) })
      }
    },
  })
}

export const useUpdateMeeting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMeeting,
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      if (meeting?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(meeting.id) })
      }
    },
  })
}

export const useDeleteMeeting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMeeting,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) })
      }
    },
  })
}

export type { ApiHttpError }
