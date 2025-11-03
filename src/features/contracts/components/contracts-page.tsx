'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  Edit3Icon,
  EllipsisIcon,
  ExternalLinkIcon,
  FileSignatureIcon,
  PlusIcon,
} from 'lucide-react'
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/hooks/use-toast'
import { PageHeader } from '@/features/layout/header/page-header'
import { useClients } from '@/features/clients/api'

import {
  CONTRACT_STATUS_OPTIONS,
  DEFAULT_CONTRACT_PAGE_SIZE,
} from '../constants'
import {
  Contract,
  useContracts,
  useCreateContract,
  useUpdateContract,
  type ApiHttpError,
} from '../api'
import { ContractFormDialog, type ContractFormValues } from './contract-form-dialog'
import { useCreateClientService } from '@/features/client-services/api'

const filtersSchema = z.object({
  clientId: z.string().optional().or(z.literal('')).catch(''),
  status: z.string().optional().or(z.literal('')).catch(''),
  startDate: z.string().optional().or(z.literal('')).catch(''),
  endDate: z.string().optional().or(z.literal('')).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(DEFAULT_CONTRACT_PAGE_SIZE),
})

export type FiltersFormValues = z.infer<typeof filtersSchema>

const buildFiltersFromSearchParams = (searchParams: ReturnType<typeof useSearchParams>) => {
  const paramsObject: Record<string, unknown> = {}

  const entries = ['clientId', 'status', 'startDate', 'endDate', 'page', 'pageSize'] as const
  for (const key of entries) {
    const value = searchParams.get(key)
    if (value !== null) {
      paramsObject[key] = value
    }
  }

  return filtersSchema.parse(paramsObject)
}

const toApiFilters = (values: FiltersFormValues) => ({
  page: values.page,
  pageSize: values.pageSize,
  status: values.status || undefined,
  clientId: values.clientId || undefined,
  startDate: values.startDate || undefined,
  endDate: values.endDate || undefined,
})

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'cancelled':
    case 'closed':
      return 'destructive'
    default:
      return 'outline'
  }
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
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

const skeletonRows = Array.from({ length: 5 }, (_, index) => index)
const ALL_CLIENTS_OPTION_VALUE = '__ALL_CONTRACT_CLIENTS__'
const ALL_STATUS_OPTION_VALUE = '__ALL_CONTRACT_STATUS__'

export function ContractsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()

  const form = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: buildFiltersFromSearchParams(searchParams),
  })

  const values = useWatch({ control: form.control }) as FiltersFormValues

  useEffect(() => {
    const parsed = buildFiltersFromSearchParams(searchParams)
    const current: FiltersFormValues = {
      clientId: values.clientId ?? '',
      status: values.status ?? '',
      startDate: values.startDate ?? '',
      endDate: values.endDate ?? '',
      page: values.page ?? 1,
      pageSize: values.pageSize ?? DEFAULT_CONTRACT_PAGE_SIZE,
    }

    if (JSON.stringify(parsed) !== JSON.stringify(current)) {
      form.reset(parsed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, searchParamsString])

  useEffect(() => {
    const params = new URLSearchParams()

    if (values.clientId) {
      params.set('clientId', values.clientId)
    }

    if (values.status) {
      params.set('status', values.status)
    }

    if (values.startDate) {
      params.set('startDate', values.startDate)
    }

    if (values.endDate) {
      params.set('endDate', values.endDate)
    }

    if (values.page && values.page !== 1) {
      params.set('page', String(values.page))
    }

    if (values.pageSize && values.pageSize !== DEFAULT_CONTRACT_PAGE_SIZE) {
      params.set('pageSize', String(values.pageSize))
    }

    const next = params.toString()
    const nextUrl = next ? `${pathname}?${next}` : pathname

    if (next !== searchParamsString) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [pathname, router, searchParamsString, values])

  const apiFilters = useMemo(() => toApiFilters(values), [values])

  const contractsQuery = useContracts(apiFilters)
  const createContract = useCreateContract()
  const updateContract = useUpdateContract()
  const createClientService = useCreateClientService()

  const clientsQuery = useClients({ pageSize: 100 })

  const [dialogState, setDialogState] = useState<{ open: boolean; contract?: Contract | null }>({
    open: false,
  })
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const clientOptions = useMemo(() => {
    return (
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        name: client.companyName,
      })) ?? []
    )
  }, [clientsQuery.data?.data])

  const handleOpenCreate = useCallback(() => {
    setDialogState({ open: true })
  }, [])

  const handleOpenEdit = useCallback((contract: Contract) => {
    setDialogState({ open: true, contract })
  }, [])

  const handleDialogChange = useCallback((open: boolean) => {
    setDialogState((previous) => (open ? { ...previous, open: true } : { open: false }))
  }, [])

  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, (values.page ?? 1) - 1),
      pageSize: values.pageSize ?? DEFAULT_CONTRACT_PAGE_SIZE,
    }),
    [values.page, values.pageSize],
  )

    const handlePaginationChange = useCallback(
      (page: number) => {
        form.setValue('page', Math.max(1, page))
      },
      [form],
    )

  const handleSubmitContract = useCallback(
    async (values: ContractFormValues) => {
      const payload = {
        clientId: values.clientId,
        title: values.title,
        status: values.status,
        totalValue: values.totalValue,
        billingCycle: values.billingCycle,
        signedAt: values.signedAt,
        validUntil: values.validUntil,
        arquivoPdfUrl: values.arquivoPdfUrl,
      }

      try {
        if (dialogState.contract) {
          await updateContract.mutateAsync({ id: dialogState.contract.id, ...payload })
          toast({
            title: 'Contrato atualizado',
            description: 'As informações foram salvas com sucesso.',
          })
        } else {
          await createContract.mutateAsync(payload)
          toast({
            title: 'Contrato criado',
            description: 'O contrato foi registrado com sucesso.',
          })
        }

        setDialogState({ open: false })
      } catch (error) {
        const message =
          (error as ApiHttpError)?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar o contrato.'
        toast({
          title: 'Erro ao salvar',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createContract, dialogState.contract, updateContract],
  )

  const handleGenerateService = useCallback(
    async (contract: Contract) => {
      try {
        setGeneratingId(contract.id)
        await createClientService.mutateAsync({
          clientId: contract.clientId,
          contractId: contract.id,
          category: 'OTHERS',
          status: 'active',
          billingCycle: (contract.billingCycle as string | undefined) ?? undefined,
          monthlyFee: contract.totalValue ?? undefined,
          developmentFee: undefined,
          startDate: contract.signedAt ?? undefined,
          endDate: contract.validUntil ?? undefined,
          supportLevel: 'standard',
        })
        toast({
          title: 'Serviço criado',
          description: 'Registramos um serviço vinculado a este contrato.',
        })
      } catch (error) {
        const message =
          (error as ApiHttpError)?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível criar o serviço.'
        toast({
          title: 'Erro ao criar serviço',
          description: message,
          variant: 'destructive',
        })
      } finally {
        setGeneratingId(null)
      }
    },
    [createClientService],
  )

  const dataRows = contractsQuery.data?.data ?? []
  const totalPages = contractsQuery.data?.meta?.totalPages ?? 1
  const totalItems = contractsQuery.data?.meta?.totalItems ?? dataRows.length

  const columns = useMemo<ColumnDef<Contract>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Contrato',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.title}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.client?.tradeName || row.original.client?.companyName || '—'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(String(row.original.status))} className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'signedAt',
        header: 'Assinado em',
        cell: ({ row }) => formatDate(row.original.signedAt),
      },
      {
        accessorKey: 'validUntil',
        header: 'Válido até',
        cell: ({ row }) => formatDate(row.original.validUntil),
      },
      {
        accessorKey: 'totalValue',
        header: 'Valor total',
        cell: ({ row }) => formatCurrency(row.original.totalValue),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <EllipsisIcon className="size-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleOpenEdit(row.original)}>
                <Edit3Icon className="mr-2 size-4" /> Editar contrato
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={generatingId === row.original.id || createClientService.isPending}
                onClick={() => handleGenerateService(row.original)}
              >
                <FileSignatureIcon className="mr-2 size-4" />
                {generatingId === row.original.id ? 'Gerando...' : 'Gerar serviço'}
              </DropdownMenuItem>
              {row.original.arquivoPdfUrl ? (
                <DropdownMenuItem asChild>
                  <a
                    href={row.original.arquivoPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLinkIcon className="mr-2 size-4" /> Abrir PDF
                  </a>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [createClientService.isPending, generatingId, handleGenerateService, handleOpenEdit],
  )

  const table = useReactTable({
    data: dataRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination,
    },
  })

  const showSkeleton = contractsQuery.isLoading && dataRows.length === 0
  const showEmpty = !contractsQuery.isLoading && dataRows.length === 0

  const handleClearFilters = useCallback(() => {
    form.reset({
      clientId: '',
      status: '',
      startDate: '',
      endDate: '',
      page: 1,
      pageSize: DEFAULT_CONTRACT_PAGE_SIZE,
    })
  }, [form])

  const handlePageSizeChange = useCallback(
    (size: number) => {
      const nextSize = Number.isFinite(size) ? Math.max(5, size) : DEFAULT_CONTRACT_PAGE_SIZE
      form.setValue('pageSize', nextSize)
      form.setValue('page', 1)
    },
    [form],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
          description="Centralize contratos ativos, renovações pendentes e vincule serviços contratados pelos clientes."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Contratos' }]}
        actions={
          <Button onClick={handleOpenCreate} className="rounded-2xl">
            <PlusIcon className="mr-2 size-4" /> Novo contrato
          </Button>
        }
      />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-5">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_CLIENTS_OPTION_VALUE}
                      onValueChange={(value) => {
                        const nextValue = value === ALL_CLIENTS_OPTION_VALUE ? '' : value
                        field.onChange(nextValue)
                        form.setValue('page', 1)
                      }}
                      disabled={clientsQuery.isLoading}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_CLIENTS_OPTION_VALUE}>Todos os clientes</SelectItem>
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_STATUS_OPTION_VALUE}
                      onValueChange={(value) => {
                        const nextValue = value === ALL_STATUS_OPTION_VALUE ? '' : value
                        field.onChange(nextValue)
                        form.setValue('page', 1)
                      }}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_STATUS_OPTION_VALUE}>Todos</SelectItem>
                        {CONTRACT_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                  <FormLabel>Data inicial</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(event) => {
                        field.onChange(event.target.value)
                        form.setValue('page', 1)
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data final</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(event) => {
                        field.onChange(event.target.value)
                        form.setValue('page', 1)
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-end justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                disabled={contractsQuery.isLoading}
              >
                Limpar filtros
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap text-xs uppercase tracking-wide">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {showSkeleton
                ? skeletonRows.map((row) => (
                    <TableRow key={`skeleton-${row}`}>
                      {table.getAllColumns().map((column) => (
                        <TableCell key={`${column.id}-${row}`}>
                          <Skeleton className="h-6 w-full rounded-full bg-white/10" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : showEmpty ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                        Nenhum contrato encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-white/5">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {totalItems} contrato{totalItems === 1 ? '' : 's'}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (pagination.pageIndex > 0) {
                        handlePaginationChange(pagination.pageIndex)
                      }
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={pagination.pageIndex + 1 === page}
                        onClick={(event) => {
                          event.preventDefault()
                          handlePaginationChange(page)
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (pagination.pageIndex + 1 < totalPages) {
                        handlePaginationChange(pagination.pageIndex + 2)
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span>Itens por página</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[100px] bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ContractFormDialog
        open={dialogState.open}
        onOpenChange={handleDialogChange}
        contract={dialogState.contract}
        clients={clientOptions}
        isSubmitting={createContract.isPending || updateContract.isPending}
        onSubmit={handleSubmitContract}
      />
    </div>
  )
}
