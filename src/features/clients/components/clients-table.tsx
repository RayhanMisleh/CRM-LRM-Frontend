'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  ArrowUpDown,
  DownloadIcon,
  EllipsisIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  exportClients,
  useClients,
  useDeleteClient,
  type Client,
  type ClientListFilters,
} from '../api'
import { CLIENT_STATUS_OPTIONS, DEFAULT_CLIENT_PAGE_SIZE } from '../constants'

const filtersSchema = z.object({
  search: z.string().catch(''),
  status: z
    .string()
    .max(100)
    .or(z.literal(''))
    .nullable()
    .catch(''),
  orderBy: z
    .string()
    .max(120)
    .or(z.literal(''))
    .nullable()
    .catch(''),
  tags: z.string().catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(DEFAULT_CLIENT_PAGE_SIZE),
})

export type FiltersFormValues = z.infer<typeof filtersSchema>

const STATUS_ALL_VALUE = '__ALL__'
const statusOptions = CLIENT_STATUS_OPTIONS

const pageSizeOptions = [10, 20, 50, 100]

const parseOrderBy = (value?: string | null): SortingState => {
  if (!value) return []
  const [id, direction] = value.split(':')
  if (!id) return []
  return [
    {
      id,
      desc: direction === 'desc',
    },
  ]
}

const buildFiltersFromSearchParams = (
  searchParams: ReturnType<typeof useSearchParams>,
): FiltersFormValues => {
  const paramsObject: Record<string, unknown> = {
    search: searchParams.get('search') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    orderBy: searchParams.get('orderBy') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  }

  const tags = searchParams.getAll('tags')
  if (tags.length > 0) {
    paramsObject.tags = tags.join(', ')
  } else if (searchParams.get('tags')) {
    paramsObject.tags = searchParams.get('tags') ?? undefined
  }

  return filtersSchema.parse(paramsObject)
}

const toApiFilters = (values: FiltersFormValues): ClientListFilters => {
  const tags = values.tags
    ? values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : undefined

  return {
    page: values.page,
    pageSize: values.pageSize,
    orderBy: values.orderBy || undefined,
    status: values.status || undefined,
    search: values.search?.trim() ? values.search.trim() : undefined,
    tags,
  }
}

interface ClientsTableProps {
  onCreateClient?: () => void
  onEditClient?: (client: Client) => void
}

const SortableColumnHeader = ({
  column,
  title,
}: {
  column: Column<Client, unknown>
  title: string
}) => {
  const isSorted = column.getIsSorted()

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(isSorted === 'asc')}
      className={cn(
        'flex items-center gap-1 text-left text-sm font-medium transition hover:text-foreground',
        isSorted ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span>{title}</span>
      <ArrowUpDown className="size-3.5" />
    </button>
  )
}

export function ClientsTable({ onCreateClient, onEditClient }: ClientsTableProps) {
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
    const current = {
      search: values.search,
      status: values.status,
      orderBy: values.orderBy,
      tags: values.tags,
      page: values.page,
      pageSize: values.pageSize,
    }

    if (JSON.stringify(parsed) !== JSON.stringify(current)) {
      form.reset(parsed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, searchParamsString])

  const apiFilters = useMemo(() => toApiFilters(values), [values])

  const { data, isLoading, isFetching } = useClients(apiFilters)
  const deleteClient = useDeleteClient()
  const [isExporting, setIsExporting] = useState(false)

  const [sorting, setSorting] = useState<SortingState>(
    () => parseOrderBy(values.orderBy ?? undefined),
  )

  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, (values.page ?? 1) - 1),
      pageSize: values.pageSize ?? DEFAULT_CLIENT_PAGE_SIZE,
    }),
    [values.page, values.pageSize],
  )

  useEffect(() => {
    setSorting(parseOrderBy(values.orderBy ?? undefined))
  }, [values.orderBy])

  useEffect(() => {
    const params = new URLSearchParams()

    if (values.search?.trim()) {
      params.set('search', values.search.trim())
    }

    if (values.status) {
      params.set('status', values.status)
    }

    if (values.orderBy) {
      params.set('orderBy', values.orderBy)
    }

    if (values.tags?.trim()) {
      values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => params.append('tags', tag))
    }

    if (values.page && values.page !== 1) {
      params.set('page', String(values.page))
    }

    if (values.pageSize && values.pageSize !== DEFAULT_CLIENT_PAGE_SIZE) {
      params.set('pageSize', String(values.pageSize))
    }

    const next = params.toString()
    const nextUrl = next ? `${pathname}?${next}` : pathname

    if (next !== searchParamsString) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [pathname, router, searchParamsString, values])

  const dataRows = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1
  const totalItems = data?.meta?.totalItems ?? dataRows.length

  const handleSortingChange = useCallback(
    (updater: SortingState | ((state: SortingState) => SortingState)) => {
      setSorting((previous) => {
        const next = typeof updater === 'function' ? updater(previous) : updater
        const [first] = next

        if (first) {
          form.setValue('orderBy', `${first.id}:${first.desc ? 'desc' : 'asc'}`)
          form.setValue('page', 1)
        } else {
          form.setValue('orderBy', '')
        }

        return next
      })
    },
    [form],
  )

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((state: PaginationState) => PaginationState)) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize })
          : updater

      if (next.pageIndex !== pagination.pageIndex) {
        form.setValue('page', next.pageIndex + 1)
      }

      if (next.pageSize !== pagination.pageSize) {
        form.setValue('pageSize', next.pageSize)
        form.setValue('page', 1)
      }
    },
    [form, pagination.pageIndex, pagination.pageSize],
  )

  const handleDelete = useCallback(
    async (client: Client) => {
      const confirmed = window.confirm(
        `Tem certeza que deseja remover o cliente "${client.companyName}"?`,
      )
      if (!confirmed) return

      try {
        await deleteClient.mutateAsync(client.id)
        toast({
          title: 'Cliente removido',
          description: 'O registro foi excluído com sucesso.',
        })
      } catch (error) {
        const message =
          (error as Error)?.message ?? 'Não foi possível remover o cliente. Tente novamente.'
        toast({
          title: 'Erro ao remover',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [deleteClient],
  )

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true)
      const blob = await exportClients(apiFilters)
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
      const filename = `clientes-${timestamp}.csv`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast({
        title: 'Exportação concluída',
        description: 'Arquivo gerado a partir do filtro atual.',
      })
    } catch (error) {
      const message =
        (error as Error)?.message ?? 'Não foi possível exportar os clientes. Tente novamente.'
      toast({
        title: 'Erro ao exportar',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }, [apiFilters])

  const columns = useMemo<ColumnDef<Client>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: ({ column }) => <SortableColumnHeader column={column} title="Razão social" />,
        cell: ({ row }) => (
          <div className="font-medium text-foreground">{row.original.companyName}</div>
        ),
      },
      {
        accessorKey: 'tradeName',
        header: ({ column }) => <SortableColumnHeader column={column} title="Nome fantasia" />,
        cell: ({ row }) => row.original.tradeName ?? '—',
      },
      {
        accessorKey: 'cnpj',
        header: ({ column }) => <SortableColumnHeader column={column} title="CNPJ" />,
        cell: ({ row }) => row.original.cnpj,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'segment',
        header: ({ column }) => <SortableColumnHeader column={column} title="Segmento" />,
        cell: ({ row }) => row.original.segment ?? '—',
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags ?? []
          if (!tags.length) return <span className="text-muted-foreground">—</span>

          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full">
                  {tag}
                </Badge>
              ))}
            </div>
          )
        },
      },
      {
        accessorKey: 'lastInteractionAt',
        header: ({ column }) => <SortableColumnHeader column={column} title="Último contato" />,
        cell: ({ row }) => {
          const value = row.original.lastInteractionAt
          if (!value) return <span className="text-muted-foreground">—</span>
          try {
            return format(new Date(value), 'dd/MM/yyyy')
          } catch {
            return <span className="text-muted-foreground">—</span>
          }
        },
      },
      {
        accessorKey: 'responsible.name',
        header: 'Responsável',
        enableSorting: false,
        cell: ({ row }) => row.original.responsible?.name ?? '—',
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const client = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <EllipsisIcon className="size-4" />
                  <span className="sr-only">Abrir ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => onEditClient?.(client)}>
                  <PencilIcon className="size-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleDelete(client)}
                  variant="destructive"
                >
                  <Trash2Icon className="size-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [handleDelete, onEditClient],
  )

  const table = useReactTable({
    data: dataRows,
    columns,
    state: {
      sorting,
      pagination,
    },
    pageCount: totalPages,
    manualSorting: true,
    manualPagination: true,
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const showEmpty = !isLoading && dataRows.length === 0
  const isPending = isFetching && !isLoading

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 shadow-sm lg:flex-row lg:items-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <FormField
            control={form.control}
            name="search"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Busca</FormLabel>
                <FormControl>
                  <div className="relative">
                    <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      {...field}
                      placeholder="Buscar por nome, CNPJ ou domínio"
                      className="pl-9"
                      onChange={(event) => {
                        field.onChange(event)
                        form.setValue('page', 1)
                      }}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="w-full lg:w-48">
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value ? field.value : STATUS_ALL_VALUE}
                  onValueChange={(value) => {
                    const nextValue = value === STATUS_ALL_VALUE ? '' : value
                    field.onChange(nextValue)
                    form.setValue('page', 1)
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={STATUS_ALL_VALUE}>Todos os status</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem className="w-full lg:w-64">
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="marketing, vip"
                    onChange={(event) => {
                      field.onChange(event)
                      form.setValue('page', 1)
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pageSize"
            render={({ field }) => (
              <FormItem className="w-full lg:w-40">
                <FormLabel>Registros por página</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => {
                    field.onChange(Number(value))
                    form.setValue('page', 1)
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pageSizeOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <div className="flex gap-2 lg:ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" disabled className="w-full lg:w-auto">
                    <UploadIcon className="mr-2 size-4" /> Importar
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>em breve</TooltipContent>
            </Tooltip>
            <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Spinner className="mr-2 size-4" />
              ) : (
                <DownloadIcon className="mr-2 size-4" />
              )}
              Exportar CSV
            </Button>
            <Button type="button" onClick={onCreateClient}>
              Novo cliente
            </Button>
          </div>
        </form>
      </Form>

      <div className="overflow-hidden rounded-2xl border border-border bg-background/60 shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="size-5" /> Carregando clientes...
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  Nenhum cliente encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground sm:flex-row">
        <div>
          Página {pagination.pageIndex + 1} de {totalPages} — {totalItems} cliente(s)
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagination.pageIndex === 0 || isPending}
            onClick={() => handlePaginationChange({
              pageIndex: pagination.pageIndex - 1,
              pageSize: pagination.pageSize,
            })}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagination.pageIndex + 1 >= totalPages || isPending}
            onClick={() => handlePaginationChange({
              pageIndex: pagination.pageIndex + 1,
              pageSize: pagination.pageSize,
            })}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
