'use client'

import { useMemo } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { EllipsisIcon, PenSquareIcon, Trash2Icon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useDomains, type Domain, type DomainListFilters } from '../api'
import {
  DOMAIN_DUE_FILTER_OPTIONS,
  DOMAIN_REMINDER_OPTIONS,
  DOMAIN_STATUS_FILTER_OPTIONS,
  DOMAIN_STATUS_OPTIONS,
} from '../constants'

const statusLabels = DOMAIN_STATUS_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const reminderLabels = DOMAIN_REMINDER_OPTIONS.reduce<Record<number, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'default' as const
    case 'expiring':
      return 'secondary' as const
    case 'expired':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
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

const formatDaysUntil = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '—'
  if (value < 0) {
    const absolute = Math.abs(value)
    return absolute === 1 ? 'Expirou há 1 dia' : `Expirou há ${absolute} dias`
  }

  if (value === 0) {
    return 'Expira hoje'
  }

  if (value === 1) {
    return 'Expira em 1 dia'
  }

  return `Expira em ${value} dias`
}

const expirationBadge = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return null
  if (value < 0) {
    return (
      <Badge className="w-fit border-red-500/40 bg-red-500/10 text-red-100">EXPIRADO</Badge>
    )
  }

  if (value <= 7) {
    return (
      <Badge className="w-fit border-amber-500/40 bg-amber-500/10 text-amber-100">EXPIRANDO</Badge>
    )
  }

  return null
}

interface ClientOption {
  value: string
  label: string
}

interface DomainsTableProps {
  filters: DomainListFilters
  page: number
  pageSize: number
  clientOptions: ClientOption[]
  onFiltersChange: (filters: Partial<DomainListFilters>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onEdit: (domain: Domain) => void
  onDelete: (domain: Domain) => void
}

const pageSizeOptions = [10, 20, 50]
const ALL_DOMAIN_STATUS_VALUE = '__ALL_DOMAIN_STATUS__'
const ALL_DOMAIN_DUE_VALUE = '__ALL_DOMAIN_DUE__'
const ALL_DOMAIN_CLIENT_VALUE = '__ALL_DOMAIN_CLIENT__'
const skeletonRows = Array.from({ length: 5 }, (_, index) => index)

export function DomainsTable({
  filters,
  page,
  pageSize,
  clientOptions,
  onFiltersChange,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}: DomainsTableProps) {
  const queryFilters = useMemo(
    () => ({
      ...filters,
      page,
      pageSize,
    }),
    [filters, page, pageSize],
  )

  const domainsQuery = useDomains(queryFilters)
  const dataRows = domainsQuery.data?.data ?? []
  const totalPages = domainsQuery.data?.meta?.totalPages ?? 1
  const totalItems = domainsQuery.data?.meta?.totalItems ?? dataRows.length

  const columns = useMemo<ColumnDef<Domain>[]>(
    () => [
      {
        accessorKey: 'host',
        header: 'Domínio',
        cell: ({ row }) => {
          const domain = row.original
          const provider = domain.provider
          const autoRenew = domain.autoRenew

          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{domain.host}</span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {provider ? <span>{provider}</span> : null}
                {autoRenew ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                    Auto-renovação
                  </Badge>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'client',
        header: 'Cliente',
        cell: ({ row }) => {
          const client = row.original.client
          const fallback = row.original.clientId

          return (
            <div className="flex flex-col">
              <span>{client?.tradeName ?? client?.companyName ?? 'Cliente não informado'}</span>
              {fallback ? (
                <span className="text-xs text-muted-foreground">ID: {fallback}</span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'expiresAt',
        header: 'Expiração',
        cell: ({ row }) => {
          const domain = row.original
          const badge = expirationBadge(domain.daysUntilExpiration)

          return (
            <div className="flex flex-col gap-1">
              <span>{formatDate(domain.expiresAt)}</span>
              <span className="text-xs text-muted-foreground">{formatDaysUntil(domain.daysUntilExpiration)}</span>
              {badge}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(String(row.original.status))} className="capitalize">
            {statusLabels[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'reminderDays',
        header: 'Lembretes',
        cell: ({ row }) => {
          const reminders = row.original.reminderDays ?? []
          if (reminders.length === 0) {
            return <span>—</span>
          }

          return (
            <div className="flex flex-wrap gap-1">
              {reminders.map((value) => (
                <Badge key={value} variant="outline" className="border-white/20 bg-white/5 text-xs">
                  {reminderLabels[value] ?? `${value} dias`}
                </Badge>
              ))}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <EllipsisIcon className="size-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <PenSquareIcon className="mr-2 size-4" /> Editar domínio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(row.original)}>
                <Trash2Icon className="mr-2 size-4" /> Excluir domínio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onDelete, onEdit],
  )

  const table = useReactTable({
    data: dataRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const showSkeleton = domainsQuery.isLoading && dataRows.length === 0
  const showEmpty = !domainsQuery.isLoading && dataRows.length === 0

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = totalItems === 0 ? 0 : Math.min(totalItems, from + dataRows.length - 1)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.status ? filters.status : ALL_DOMAIN_STATUS_VALUE}
            onValueChange={(value) => {
              const nextValue = value === ALL_DOMAIN_STATUS_VALUE ? undefined : value
              onFiltersChange({ status: nextValue })
            }}
          >
            <SelectTrigger className="w-48 bg-background/60">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_STATUS_FILTER_OPTIONS.map((option) => {
                const optionValue =
                  option.value === '' ? ALL_DOMAIN_STATUS_VALUE : option.value
                const key = option.value === '' ? 'all-status' : option.value
                return (
                  <SelectItem key={key} value={optionValue}>
                    {option.label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select
            value={
              filters.dueIn !== undefined && filters.dueIn !== null
                ? String(filters.dueIn)
                : ALL_DOMAIN_DUE_VALUE
            }
            onValueChange={(value) => {
              if (value === ALL_DOMAIN_DUE_VALUE) {
                onFiltersChange({ dueIn: undefined })
                return
              }
              onFiltersChange({ dueIn: Number(value) })
            }}
          >
            <SelectTrigger className="w-52 bg-background/60">
              <SelectValue placeholder="Expira em" />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_DUE_FILTER_OPTIONS.map((option) => {
                const optionValue = option.value === '' ? ALL_DOMAIN_DUE_VALUE : option.value
                const key = option.value === '' ? 'all-due' : option.value
                return (
                  <SelectItem key={key} value={optionValue}>
                    {option.label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select
            value={filters.clientId ? filters.clientId : ALL_DOMAIN_CLIENT_VALUE}
            onValueChange={(value) => {
              const nextValue = value === ALL_DOMAIN_CLIENT_VALUE ? undefined : value
              onFiltersChange({ clientId: nextValue })
            }}
          >
            <SelectTrigger className="w-60 bg-background/60">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DOMAIN_CLIENT_VALUE}>Todos os clientes</SelectItem>
              {clientOptions.map((client) => (
                <SelectItem key={client.value} value={client.value}>
                  {client.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
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
                  <TableRow key={`domain-skeleton-${row}`}>
                    {table.getAllColumns().map((column) => (
                      <TableCell key={`${column.id}-${row}`}>
                        <Skeleton className="h-6 w-full rounded-full bg-white/10" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : showEmpty
                ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                        Nenhum domínio encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )
                : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-white/5">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {totalItems === 0
            ? 'Nenhum domínio'
            : `Mostrando ${from}-${to} de ${totalItems} domínio${totalItems === 1 ? '' : 's'}`}
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <div className="flex items-center gap-2 text-sm">
            <span>Itens por página</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-[110px] bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {totalPages > 1 ? (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (page > 1) {
                        onPageChange(page - 1)
                      }
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const current = index + 1
                  return (
                    <PaginationItem key={current}>
                      <PaginationLink
                        href="#"
                        isActive={current === page}
                        onClick={(event) => {
                          event.preventDefault()
                          onPageChange(current)
                        }}
                      >
                        {current}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (page < totalPages) {
                        onPageChange(page + 1)
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      </div>
    </div>
  )
}
