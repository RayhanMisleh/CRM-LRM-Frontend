'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, ClockIcon, MapPinIcon, PencilLineIcon, Trash2Icon, UserCircleIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'

import type { Meeting } from '../api'

const statusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  postponed: 'Adiada',
}

const statusStyles: Record<string, string> = {
  scheduled: 'bg-emerald-500/15 text-emerald-100 border border-emerald-300/40',
  completed: 'bg-sky-500/15 text-sky-100 border border-sky-300/40',
  cancelled: 'bg-rose-500/15 text-rose-100 border border-rose-300/40',
  postponed: 'bg-amber-500/15 text-amber-100 border border-amber-300/40',
}

export interface MeetingsListProps {
  meetings?: Meeting[]
  isLoading?: boolean
  selectedMeetingId?: string | null
  onSelectMeeting?: (meeting: Meeting) => void
  onEditMeeting?: (meeting: Meeting) => void
  onDeleteMeeting?: (meeting: Meeting) => void
}

const formatHeader = (value: string | null) => {
  if (!value) {
    return 'Sem data definida'
  }

  try {
    const date = parseISO(value)
    if (Number.isNaN(date.getTime())) {
      return 'Sem data definida'
    }

    return format(date, 'dd/MM/yyyy')
  } catch (error) {
    return 'Sem data definida'
  }
}

const formatTimeRange = (meeting: Meeting) => {
  try {
    const start = parseISO(meeting.scheduledAt)
    if (Number.isNaN(start.getTime())) {
      return 'Horário indefinido'
    }

    const duration = meeting.durationMinutes ?? 60
    const end = new Date(start.getTime() + duration * 60_000)
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
  } catch (error) {
    return 'Horário indefinido'
  }
}

export function MeetingsList({
  meetings = [],
  isLoading,
  selectedMeetingId,
  onSelectMeeting,
  onEditMeeting,
  onDeleteMeeting,
}: MeetingsListProps) {
  const groupedMeetings = useMemo(() => {
    const groups = new Map<string, Meeting[]>()

    meetings.forEach((meeting) => {
      const key = meeting.scheduledAt ? meeting.scheduledAt.slice(0, 10) : 'unscheduled'
      const current = groups.get(key) ?? []
      current.push(meeting)
      groups.set(key, current)
    })

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        label: key === 'unscheduled' ? null : key,
        meetings: items.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      }))
      .sort((a, b) => {
        if (a.key === 'unscheduled') return 1
        if (b.key === 'unscheduled') return -1
        return a.key.localeCompare(b.key)
      })
  }, [meetings])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
        <Spinner className="text-white" />
      </div>
    )
  }

  if (!meetings.length) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 text-center text-white/70">
        <CalendarIcon className="size-10" />
        <p className="text-sm font-medium text-white/80">Nenhuma reunião encontrada</p>
        <p className="text-xs text-white/60">Ajuste os filtros ou agende uma nova reunião.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-1 text-white">
      <ScrollArea className="h-[28rem] pr-2">
        <div className="space-y-6 p-3">
          {groupedMeetings.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="px-1 text-sm font-semibold uppercase tracking-wide text-white/70">
                {formatHeader(group.label)}
              </div>
              <div className="space-y-2">
                {group.meetings.map((meeting) => {
                  const isSelected = meeting.id === selectedMeetingId
                  const statusLabel = statusLabels[meeting.status] ?? meeting.status
                  const statusClass = statusStyles[meeting.status] ?? 'bg-white/10 text-white border border-white/20'

                  return (
                    <div
                      key={meeting.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectMeeting?.(meeting)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectMeeting?.(meeting)
                        }
                      }}
                      className={`group rounded-2xl border ${
                        isSelected ? 'border-white/60 bg-white/15' : 'border-white/10 bg-white/10'
                      } p-4 transition hover:border-white/40 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-white">{meeting.subject}</h4>
                            <Badge variant="secondary" className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/70">
                            <span className="inline-flex items-center gap-1">
                              <ClockIcon className="size-3.5" />
                              {formatTimeRange(meeting)}
                            </span>
                            {meeting.clientName ? (
                              <span className="inline-flex items-center gap-1">
                                <UserCircleIcon className="size-3.5" />
                                {meeting.clientName}
                              </span>
                            ) : null}
                            {meeting.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPinIcon className="size-3.5" />
                                {meeting.location}
                              </span>
                            ) : null}
                          </div>
                          {meeting.notes ? (
                            <p className="text-xs text-white/60">{meeting.notes}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-white/80 hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation()
                              onEditMeeting?.(meeting)
                            }}
                          >
                            <PencilLineIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-white/80 hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation()
                              onDeleteMeeting?.(meeting)
                            }}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
