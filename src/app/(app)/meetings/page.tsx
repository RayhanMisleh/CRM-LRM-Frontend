'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, endOfDay, format, startOfDay } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { PageHeader } from '@/features/layout/header/page-header'
import { useClients } from '@/features/clients/api'
import {
  useCreateMeeting,
  useDeleteMeeting,
  useMeetings,
  useUpdateMeeting,
  type Meeting,
  type MeetingListFilters,
} from '@/features/meetings/api'
import { MeetingsCalendar } from '@/features/meetings/components/meetings-calendar'
import { MeetingsList } from '@/features/meetings/components/meetings-list'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from '@/hooks/use-toast'

const DEFAULT_NEXT_HOURS = 72
const DEFAULT_DURATION_MINUTES = 60

const meetingFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione o cliente'),
  subject: z.string().min(1, 'Informe o assunto da reunião'),
  status: z.string().min(1, 'Informe o status'),
  scheduledAt: z.string().min(1, 'Informe a data e horário'),
  durationMinutes: z
    .coerce.number()
    .optional()
    .or(z.nan())
    .transform((value) => (Number.isFinite(value) ? value : undefined))
    .refine((value) => value === undefined || value > 0, {
      message: 'A duração deve ser maior que zero',
    })
    .refine((value) => value === undefined || value <= 1440, {
      message: 'A duração máxima é de 24 horas',
    }),
  location: z.string().optional(),
  notes: z.string().optional(),
})

const MEETING_STATUS_OPTIONS = [
  { label: 'Agendada', value: 'scheduled' },
  { label: 'Concluída', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
  { label: 'Adiada', value: 'postponed' },
]

type MeetingFormValues = z.infer<typeof meetingFormSchema>

type ViewMode = 'nextHours' | 'range'

const formatDateTimeInput = (value?: string | Date | null) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from) return 'Selecionar intervalo'
  const from = format(range.from, 'dd/MM/yyyy')
  const toDate = range.to ?? range.from
  const to = format(toDate, 'dd/MM/yyyy')
  return from === to ? from : `${from} - ${to}`
}

export default function MeetingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const initialClientId = searchParams.get('clientId') ?? undefined
  const shouldOpenOnMount = searchParams.get('new') === '1'

  const [viewMode, setViewMode] = useState<ViewMode>('nextHours')
  const [nextHours, setNextHours] = useState<number>(DEFAULT_NEXT_HOURS)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: addDays(today, 7) }
  })
  const [clientFilter, setClientFilter] = useState<string | undefined>(initialClientId ?? undefined)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)

  const meetingForm = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      clientId: initialClientId ?? '',
      subject: '',
      status: MEETING_STATUS_OPTIONS[0]?.value ?? 'scheduled',
      scheduledAt: formatDateTimeInput(new Date()),
      durationMinutes: DEFAULT_DURATION_MINUTES,
      location: '',
      notes: '',
    },
  })

  const clientsQuery = useClients({ pageSize: 200 })
  const createMeeting = useCreateMeeting()
  const updateMeeting = useUpdateMeeting()
  const deleteMeeting = useDeleteMeeting()
  const confirm = useConfirm()

  const clientOptions = useMemo(
    () =>
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        name: client.tradeName ?? client.companyName,
      })) ?? [],
    [clientsQuery.data?.data],
  )

  useEffect(() => {
    setClientFilter(initialClientId ?? undefined)
  }, [initialClientId])

  useEffect(() => {
    if (viewMode === 'range' && !dateRange?.from) {
      const today = new Date()
      setDateRange({ from: today, to: addDays(today, 7) })
    }
  }, [dateRange?.from, viewMode])

  const meetingsFilters = useMemo<MeetingListFilters>(() => {
    const filters: MeetingListFilters = {}

    if (clientFilter) {
      filters.clientId = clientFilter
    }

    if (viewMode === 'nextHours') {
      filters.nextHours = nextHours
    } else if (viewMode === 'range' && dateRange?.from) {
      const start = startOfDay(dateRange.from)
      const endDate = dateRange.to ?? dateRange.from
      const end = endOfDay(endDate)
      filters.startDate = start.toISOString()
      filters.endDate = end.toISOString()
    }

    return filters
  }, [clientFilter, dateRange, nextHours, viewMode])

  const meetingsQuery = useMeetings(meetingsFilters)
  const meetings = meetingsQuery.data?.data ?? []

  useEffect(() => {
    if (!meetings.length) {
      setSelectedMeetingId(null)
      return
    }

    setSelectedMeetingId((current) => {
      if (current && meetings.some((meeting) => meeting.id === current)) {
        return current
      }
      return meetings[0]?.id ?? null
    })
  }, [meetings])

  const handleClientFilterChange = useCallback(
    (value: string) => {
      const parsed = value || undefined
      setClientFilter(parsed)

      const params = new URLSearchParams(searchParams.toString())
      if (parsed) {
        params.set('clientId', parsed)
      } else {
        params.delete('clientId')
      }

      router.replace(`/meetings${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
    },
    [router, searchParams],
  )

  const handleNextHoursChange = useCallback((value: number) => {
    if (Number.isNaN(value) || value <= 0) {
      setNextHours(DEFAULT_NEXT_HOURS)
      return
    }

    setNextHours(Math.min(720, Math.max(1, Math.round(value))))
  }, [])

  const handleSelectMeeting = useCallback((meeting: Meeting | string) => {
    if (typeof meeting === 'string') {
      setSelectedMeetingId(meeting)
      return
    }

    setSelectedMeetingId(meeting.id)
  }, [])

  const handleOpenCreate = useCallback(() => {
    const defaultClient = clientFilter ?? initialClientId ?? ''
    setEditingMeeting(null)
    setIsDialogOpen(true)
    meetingForm.reset({
      clientId: defaultClient,
      subject: '',
      status: MEETING_STATUS_OPTIONS[0]?.value ?? 'scheduled',
      scheduledAt: formatDateTimeInput(new Date()),
      durationMinutes: DEFAULT_DURATION_MINUTES,
      location: '',
      notes: '',
    })
  }, [clientFilter, initialClientId, meetingForm])

  useEffect(() => {
    if (!shouldOpenOnMount) return
    handleOpenCreate()

    const params = new URLSearchParams(searchParamsString)
    params.delete('new')
    router.replace(`/meetings${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [handleOpenCreate, router, searchParamsString, shouldOpenOnMount])

  const handleEditMeeting = useCallback(
    (meeting: Meeting) => {
      setEditingMeeting(meeting)
      setIsDialogOpen(true)
      meetingForm.reset({
        clientId: meeting.clientId ?? '',
        subject: meeting.subject ?? '',
        status: meeting.status ?? MEETING_STATUS_OPTIONS[0]?.value ?? 'scheduled',
        scheduledAt: formatDateTimeInput(meeting.scheduledAt),
        durationMinutes: meeting.durationMinutes ?? DEFAULT_DURATION_MINUTES,
        location: meeting.location ?? '',
        notes: meeting.notes ?? '',
      })
      setSelectedMeetingId(meeting.id)
    },
    [meetingForm],
  )

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open)
      if (!open) {
        setEditingMeeting(null)
      }
    },
    [],
  )

  const handleClearFilters = useCallback(() => {
    const today = new Date()
    setClientFilter(initialClientId ?? undefined)
    setViewMode('nextHours')
    setNextHours(DEFAULT_NEXT_HOURS)
    setDateRange({ from: today, to: addDays(today, 7) })

    const params = new URLSearchParams(searchParams.toString())
    if (initialClientId) {
      params.set('clientId', initialClientId)
    } else {
      params.delete('clientId')
    }
    router.replace(`/meetings${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [initialClientId, router, searchParams])

  const handleSubmitMeeting = meetingForm.handleSubmit(async (values) => {
    const payload = {
      clientId: values.clientId,
      subject: values.subject,
      status: values.status,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
      durationMinutes: values.durationMinutes ?? undefined,
      location: values.location?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    }

    try {
      let meeting: Meeting
      if (editingMeeting) {
        meeting = await updateMeeting.mutateAsync({ ...payload, id: editingMeeting.id })
        toast({
          title: 'Reunião atualizada',
          description: 'As informações da reunião foram atualizadas com sucesso.',
        })
      } else {
        meeting = await createMeeting.mutateAsync(payload)
        toast({
          title: 'Reunião agendada',
          description: 'A nova reunião foi adicionada ao calendário.',
        })
      }

      setIsDialogOpen(false)
      setEditingMeeting(null)
      setSelectedMeetingId(meeting.id)
    } catch (error) {
      const message =
        (error as { friendlyMessage?: string })?.friendlyMessage ??
        (error as Error)?.message ??
        'Não foi possível salvar a reunião.'

      toast({
        title: 'Erro ao salvar reunião',
        description: message,
        variant: 'destructive',
      })
    }
  })

  const handleDeleteMeeting = useCallback(
    async (meeting: Meeting) => {
      const confirmed = await confirm({
        title: 'Excluir reunião',
        description: `Tem certeza que deseja excluir "${meeting.subject}"?`,
        confirmText: 'Excluir',
        confirmVariant: 'destructive',
        cancelText: 'Cancelar',
      })

      if (!confirmed) return

      try {
        await deleteMeeting.mutateAsync({ id: meeting.id })
        toast({
          title: 'Reunião removida',
          description: 'A reunião foi excluída com sucesso.',
        })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível excluir a reunião.'

        toast({
          title: 'Erro ao excluir',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [confirm, deleteMeeting],
  )

  const isSavingMeeting = createMeeting.isPending || updateMeeting.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reuniões"
        description="Controle agendas, notas e follow-ups para garantir engajamento com clientes e leads."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Reuniões' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
          >
            Agendar reunião
          </Button>
        }
      />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1 space-y-2">
            <Label htmlFor="client-filter" className="text-sm text-white/70">
              Cliente
            </Label>
            <Select value={clientFilter ?? ''} onValueChange={handleClientFilterChange}>
              <SelectTrigger
                id="client-filter"
                className="w-full rounded-full border-white/20 bg-white/10 text-left text-white hover:bg-white/15"
              >
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os clientes</SelectItem>
                {clientOptions.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/70">Período</Label>
            <ButtonGroup className="rounded-full border border-white/20 bg-white/10 p-1">
              <Button
                size="sm"
                variant={viewMode === 'nextHours' ? 'default' : 'ghost'}
                className={`rounded-full px-4 ${
                  viewMode === 'nextHours' ? 'bg-white text-black hover:bg-white' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setViewMode('nextHours')}
              >
                Próximas horas
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'range' ? 'default' : 'ghost'}
                className={`rounded-full px-4 ${
                  viewMode === 'range' ? 'bg-white text-black hover:bg-white' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setViewMode('range')}
              >
                Intervalo de datas
              </Button>
            </ButtonGroup>
          </div>

          {viewMode === 'nextHours' ? (
            <div className="space-y-2">
              <Label htmlFor="hours-filter" className="text-sm text-white/70">
                Próximas (horas)
              </Label>
              <Input
                id="hours-filter"
                type="number"
                min={1}
                max={720}
                value={nextHours}
                onChange={(event) => handleNextHoursChange(Number(event.target.value))}
                className="w-32 rounded-full border-white/20 bg-white/10 text-white"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm text-white/70">Intervalo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="rounded-full border border-white/20 bg-white/10 px-4 text-white hover:bg-white/15">
                    {formatRangeLabel(dateRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-white/10 bg-background p-0 text-foreground">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range ?? undefined)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="ml-auto flex items-end">
            <Button variant="ghost" className="rounded-full text-white/80 hover:bg-white/10" onClick={handleClearFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <MeetingsCalendar
          meetings={meetings}
          selectedMeetingId={selectedMeetingId ?? undefined}
          onSelectMeeting={(id) => handleSelectMeeting(id)}
        />
        <MeetingsList
          meetings={meetings}
          isLoading={meetingsQuery.isLoading}
          selectedMeetingId={selectedMeetingId}
          onSelectMeeting={handleSelectMeeting}
          onEditMeeting={handleEditMeeting}
          onDeleteMeeting={handleDeleteMeeting}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 text-white">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? 'Editar reunião' : 'Agendar reunião'}</DialogTitle>
            <DialogDescription className="text-white/70">
              Defina o cliente, horário e detalhes para manter sua equipe alinhada.
            </DialogDescription>
          </DialogHeader>
          <Form {...meetingForm}>
            <form onSubmit={handleSubmitMeeting} className="space-y-4">
              <FormField
                control={meetingForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-2xl border-white/20 bg-white/10 text-white">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientOptions.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={meetingForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Reunião de alinhamento"
                        className="rounded-2xl border-white/20 bg-white/10 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={meetingForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-2xl border-white/20 bg-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MEETING_STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={meetingForm.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e horário</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="rounded-2xl border-white/20 bg-white/10 text-white"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={meetingForm.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          max={1440}
                          step={5}
                          className="rounded-2xl border-white/20 bg-white/10 text-white"
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.value
                            if (!value) {
                              field.onChange(undefined)
                              return
                            }

                            const parsed = Number(value)
                            field.onChange(Number.isNaN(parsed) ? undefined : parsed)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={meetingForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Link ou endereço"
                          className="rounded-2xl border-white/20 bg-white/10 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={meetingForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais, agenda ou próximos passos"
                        className="rounded-2xl border-white/20 bg-white/10 text-white"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-4 flex items-center justify-between gap-2">
                {editingMeeting ? (
                  <Badge variant="secondary" className="rounded-full border border-white/20 bg-white/10 text-xs text-white/80">
                    Criada em {format(new Date(editingMeeting.createdAt), 'dd/MM/yyyy HH:mm')}
                  </Badge>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full text-white/80 hover:bg-white/10"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingMeeting}
                    className="rounded-full border border-white/20 bg-white/20 text-white hover:bg-white/30"
                  >
                    {isSavingMeeting ? 'Salvando...' : editingMeeting ? 'Atualizar reunião' : 'Criar reunião'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
