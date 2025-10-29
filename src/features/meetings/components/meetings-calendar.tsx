'use client'

import { useMemo, useRef } from 'react'
import FullCalendar, { type DatesSetArg, type EventClickArg, type EventContentArg } from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { addMinutes, format, parseISO } from 'date-fns'

import '@fullcalendar/core/index.css'
import '@fullcalendar/daygrid/index.css'
import '@fullcalendar/timegrid/index.css'

import type { Meeting } from '../api'

const EVENT_DEFAULT_DURATION = 60

const statusClassNames: Record<string, string> = {
  scheduled: 'bg-emerald-500/20 text-emerald-100 ring-emerald-300/40',
  completed: 'bg-sky-500/20 text-sky-100 ring-sky-300/40',
  cancelled: 'bg-rose-500/15 text-rose-100 ring-rose-300/40',
  postponed: 'bg-amber-500/20 text-amber-100 ring-amber-300/40',
}

export interface MeetingsCalendarProps {
  meetings?: Meeting[]
  selectedMeetingId?: string | null
  onSelectMeeting?: (meetingId: string) => void
  onDateRangeChange?: (range: { start: Date; end: Date }) => void
  initialDate?: Date
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
}

const getMeetingEndDate = (meeting: Meeting) => {
  const start = parseISO(meeting.scheduledAt)
  if (Number.isNaN(start.getTime())) {
    return undefined
  }

  const duration = meeting.durationMinutes ?? EVENT_DEFAULT_DURATION
  return addMinutes(start, duration)
}

const renderEventContent = (arg: EventContentArg) => {
  const meeting = arg.event.extendedProps.meeting as Meeting | undefined
  if (!meeting) {
    return null
  }

  const start = parseISO(meeting.scheduledAt)
  const end = getMeetingEndDate(meeting)

  const timeLabel = Number.isNaN(start.getTime())
    ? 'Horário indefinido'
    : `${format(start, 'HH:mm')}${end ? ` - ${format(end, 'HH:mm')}` : ''}`

  return (
    <div className="flex flex-col gap-1 text-left">
      <span className="text-xs font-semibold leading-tight">{meeting.subject}</span>
      <span className="text-[0.65rem] font-medium text-white/80 leading-none">{timeLabel}</span>
      {meeting.clientName ? (
        <span className="text-[0.65rem] text-white/60 leading-none">{meeting.clientName}</span>
      ) : null}
    </div>
  )
}

export function MeetingsCalendar({
  meetings = [],
  selectedMeetingId,
  onSelectMeeting,
  onDateRangeChange,
  initialDate,
  initialView = 'dayGridMonth',
}: MeetingsCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null)

  const events = useMemo(
    () =>
      meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.subject,
        start: meeting.scheduledAt,
        end: getMeetingEndDate(meeting)?.toISOString(),
        extendedProps: { meeting },
      })),
    [meetings],
  )

  const handleEventClick = (event: EventClickArg) => {
    onSelectMeeting?.(event.event.id)
  }

  const handleDateSet = (arg: DatesSetArg) => {
    onDateRangeChange?.({ start: arg.start, end: arg.end })
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-white shadow-sm">
      <FullCalendar
        ref={(instance) => {
          calendarRef.current = instance
        }}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        initialDate={initialDate}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        height="auto"
        weekends
        events={events}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        datesSet={handleDateSet}
        slotEventOverlap={false}
        stickyHeaderDates
        dayMaxEventRows={3}
        displayEventTime={false}
        expandRows
        eventClassNames={(arg) => {
          const meeting = arg.event.extendedProps.meeting as Meeting | undefined
          const base = ['!border-0', 'rounded-2xl', 'px-3', 'py-2', 'text-white', 'shadow-sm', 'transition', 'cursor-pointer']

          if (meeting?.status) {
            base.push(statusClassNames[meeting.status] ?? 'bg-white/15 text-white/90 ring-white/30')
          } else {
            base.push('bg-white/15 text-white/90 ring-white/30')
          }

          if (arg.event.id === selectedMeetingId) {
            base.push('ring-2')
          }

          return base
        }}
        dayHeaderClassNames={() => 'text-white/80 font-medium'}
        weekNumberCalculation="ISO"
      />
    </div>
  )
}
