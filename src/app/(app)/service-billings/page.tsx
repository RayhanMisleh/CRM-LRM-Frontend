'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { Pause, Play, Trash2, MoreVertical, DollarSign, Calendar } from 'lucide-react'
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { useClients } from '@/features/clients/api'
import { useClientServices } from '@/features/client-services/api'
import {
  useServiceBillings,
  useCreateServiceBilling,
  useUpdateServiceBilling,
  useDeleteServiceBilling,
  type ServiceBilling,
} from '@/features/service-billings/api'
import { ServiceBillingFormDialog, type ServiceBillingFormValues } from '@/features/service-billings/components/service-billing-form-dialog'
import { toast } from '@/hooks/use-toast'

const DEFAULT_PAGE_SIZE = 10

const filtersSchema = z.object({
  clientId: z.string().optional().or(z.literal('')).catch(''),
  clientServiceId: z.string().optional().or(z.literal('')).catch(''),
  status: z.string().optional().or(z.literal('')).catch(''),
  cycle: z.string().optional().or(z.literal('')).catch(''),
  startDate: z.string().optional().or(z.literal('')).catch(''),
  endDate: z.string().optional().or(z.literal('')).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(DEFAULT_PAGE_SIZE),
})

type FiltersFormValues = z.infer<typeof filtersSchema>

const buildFiltersFromSearchParams = (searchParams: ReturnType<typeof useSearchParams>) => {
  const paramsObject: Record<string, unknown> = {}
  for (const key of ['clientId', 'clientServiceId', 'status', 'cycle', 'startDate', 'endDate', 'page', 'pageSize'] as const) {
    const value = searchParams.get(key)
    if (value !== null) {
      paramsObject[key] = value
    }
  }
  return filtersSchema.parse(paramsObject)
}

const toApiFilters = (values: FiltersFormValues) => ({
  clientId: values.clientId || undefined,
  clientServiceId: values.clientServiceId || undefined,
  status: values.status || undefined,
  cycle: values.cycle || undefined,
  startDate: values.startDate || undefined,
  endDate: values.endDate || undefined,
  page: values.page,
  pageSize: values.pageSize,
})

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return format(date, 'dd/MM/yyyy')
  } catch {
    return '—'
  }
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  ended: 'Encerrada',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-200',
  paused: 'bg-amber-500/20 text-amber-200',
  cancelled: 'bg-rose-500/20 text-rose-200',
  ended: 'bg-slate-500/20 text-slate-200',
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semester: 'Semestral',
  yearly: 'Anual',
}

const ALL_FILTER_VALUE = '__ALL_SERVICE_BILLINGS__'

export default function ServiceBillingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()

  const form = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: buildFiltersFromSearchParams(searchParams),
  })

  const values = useWatch({ control: form.control }) as FiltersFormValues | undefined
  const apiFilters = useMemo(
    () => toApiFilters((values ?? form.getValues()) as FiltersFormValues),
    [form, values],
  )

  const billingsQuery = useServiceBillings(apiFilters)
  const createBilling = useCreateServiceBilling()
  const updateBilling = useUpdateServiceBilling()
  const deleteBilling = useDeleteServiceBilling()

  const clientsQuery = useClients({ pageSize: 100 })
  const servicesQuery = useClientServices({ clientId: values?.clientId || undefined, pageSize: 100 })

  const clientOptions = useMemo(
    () =>
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        name: client.tradeName ?? client.companyName,
      })) ?? [],
    [clientsQuery.data?.data],
  )

  const serviceOptions = useMemo(
    () =>
      servicesQuery.data?.data?.map((service) => ({
        id: service.id,
        name: service.template?.name ?? service.id,
      })) ?? [],
    [servicesQuery.data?.data],
  )

  useEffect(() => {
    const persistedValues = (values ?? form.getValues()) as FiltersFormValues
    const params = new URLSearchParams(searchParamsString)
    ;(['clientId', 'clientServiceId', 'status', 'cycle', 'startDate', 'endDate', 'page', 'pageSize'] as const).forEach(
      (key) => {
        const value = persistedValues[key]

        if (!value || (typeof value === 'number' && Number.isNaN(value))) {
          params.delete(key)
          return
        }

        if (key === 'page' && Number(value) === 1) {
          params.delete(key)
          return
        }

        if (key === 'pageSize' && Number(value) === DEFAULT_PAGE_SIZE) {
          params.delete(key)
          return
        }

        params.set(key, String(value))
      },
    )

    const next = params.toString()
    if (next !== searchParamsString) {
      const nextUrl = next ? `${pathname}?${next}` : pathname
      router.replace(nextUrl, { scroll: false })
    }
  }, [form, pathname, router, searchParamsString, values])

  const [dialogState, setDialogState] = useState<{ open: boolean; billing: ServiceBilling | null }>({
    open: false,
    billing: null,
  })

  const dataRows = billingsQuery.data?.data ?? []
  const totalPages = billingsQuery.data?.meta?.totalPages ?? 1
  const totalItems = billingsQuery.data?.meta?.totalItems ?? dataRows.length

  const columns = useMemo<ColumnDef<ServiceBilling>[]>(
    () => [
      {
        accessorKey: 'service',
        header: 'Serviço',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.service?.name ??
                serviceOptions.find((service) => service.id === row.original.clientServiceId)?.name ??
                row.original.clientServiceId}
            </span>
            {row.original.service?.clientName ? (
              <span className="text-xs text-muted-foreground">{row.original.service.clientName}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge className={`border border-white/10 ${STATUS_STYLES[row.original.status] ?? 'bg-white/10 text-white'}`}>
            {STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'cycle',
        header: 'Ciclo',
        cell: ({ row }) => CYCLE_LABELS[row.original.cycle] ?? row.original.cycle,
      },
      {
        accessorKey: 'monthlyAmount',
        header: 'Valor mensal',
        cell: ({ row }) => (
          <span className="flex items-center gap-1">
            <DollarSign className="size-3" /> {formatCurrency(row.original.monthlyAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'startDate',
        header: 'Início',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" /> {formatDate(row.original.startDate)}
          </span>
        ),
      },
      {
        accessorKey: 'endDate',
        header: 'Encerramento',
        cell: ({ row }) => formatDate(row.original.endDate),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDialogState({ open: true, billing: row.original })}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(row.original, 'active')}>
                <Play className="mr-2 size-4" /> Ativar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(row.original, 'paused')}>
                <Pause className="mr-2 size-4" /> Pausar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteBilling(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [serviceOptions],
  )

  const table = useReactTable({
    data: dataRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleOpenCreate = useCallback(() => {
    setDialogState({ open: true, billing: null })
  }, [])

  const handleDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setDialogState({ open: false, billing: null })
    }
  }, [])

  const handleSubmitBilling = useCallback(
    async (values: ServiceBillingFormValues) => {
      try {
        if (dialogState.billing) {
          await updateBilling.mutateAsync({ id: dialogState.billing.id, ...values })
          toast({ title: 'Cobrança atualizada', description: 'Os dados foram salvos.' })
        } else {
          await createBilling.mutateAsync(values)
          toast({ title: 'Cobrança criada', description: 'A recorrência foi registrada.' })
        }
        setDialogState({ open: false, billing: null })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar a cobrança.'
        toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' })
      }
    },
    [createBilling, dialogState.billing, updateBilling],
  )

  const handleDeleteBilling = useCallback(
    async (billing: ServiceBilling) => {
      try {
        await deleteBilling.mutateAsync(billing.id)
        toast({ title: 'Cobrança removida', description: 'A recorrência foi removida.' })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível remover a cobrança.'
        toast({ title: 'Erro ao remover', description: message, variant: 'destructive' })
      }
    },
    [deleteBilling],
  )

  const handleStatusChange = useCallback(
    async (billing: ServiceBilling, status: string) => {
      try {
        await updateBilling.mutateAsync({ id: billing.id, status })
        toast({ title: 'Status atualizado', description: 'A cobrança foi atualizada.' })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível atualizar o status.'
        toast({ title: 'Erro ao atualizar', description: message, variant: 'destructive' })
      }
    },
    [updateBilling],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      form.setValue('page', Math.max(1, page))
    },
    [form],
  )

  const handlePageSizeChange = useCallback(
    (size: number) => {
      form.setValue('pageSize', Math.max(5, size))
      form.setValue('page', 1)
    },
    [form],
  )

  const handleClearFilters = useCallback(() => {
    form.reset({
      clientId: '',
      clientServiceId: '',
      status: '',
      cycle: '',
      startDate: '',
      endDate: '',
      page: 1,
      pageSize: form.getValues('pageSize'),
    })
  }, [form])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranças"
        description="Gerencie as recorrências financeiras vinculadas aos serviços dos clientes."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Cobranças' }]}
        actions={<Button onClick={handleOpenCreate}>Nova cobrança</Button>}
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_FILTER_VALUE}
                      onValueChange={(value) => field.onChange(value === ALL_FILTER_VALUE ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
                        {clientOptions.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientServiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_FILTER_VALUE}
                      onValueChange={(value) => field.onChange(value === ALL_FILTER_VALUE ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
                        {serviceOptions.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_FILTER_VALUE}
                      onValueChange={(value) => field.onChange(value === ALL_FILTER_VALUE ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciclo</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_FILTER_VALUE}
                      onValueChange={(value) => field.onChange(value === ALL_FILTER_VALUE ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
                        {Object.entries(CYCLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Início a partir de</FormLabel>
                  <FormControl>
                    <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Início até</FormLabel>
                  <FormControl>
                    <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={handleClearFilters}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
        {billingsQuery.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : dataRows.length === 0 ? (
          <EmptyPlaceholder
            title="Nenhuma cobrança localizada"
            description="Cadastre uma cobrança ou ajuste os filtros para visualizar resultados."
          >
            <Button onClick={handleOpenCreate}>Nova cobrança</Button>
          </EmptyPlaceholder>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-white/60">
          Exibindo {dataRows.length} de {totalItems} cobranças
        </p>
        <div className="flex items-center gap-4">
          <Select
            value={String(form.getValues('pageSize'))}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Itens" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}/página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, form.getValues('page') - 1))}
                  className="cursor-pointer"
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    isActive={form.getValues('page') === index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className="cursor-pointer"
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, form.getValues('page') + 1))}
                  className="cursor-pointer"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <ServiceBillingFormDialog
        open={dialogState.open}
        onOpenChange={handleDialogChange}
        billing={dialogState.billing}
        onSubmit={handleSubmitBilling}
        isSubmitting={createBilling.isPending || updateBilling.isPending}
        clientId={values?.clientId || undefined}
      />
    </div>
  )
}
