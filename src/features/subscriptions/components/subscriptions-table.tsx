'use client'

import { useMemo } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { BanIcon, EllipsisIcon, PenSquareIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useSubscriptions, type Subscription, type SubscriptionListFilters } from '../api'
import { SUBSCRIPTION_CYCLE_OPTIONS, SUBSCRIPTION_STATUS_OPTIONS } from '../constants'

const statusLabels = SUBSCRIPTION_STATUS_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const cycleLabels = SUBSCRIPTION_CYCLE_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'default' as const
    case 'trialing':
      return 'secondary' as const
    case 'past_due':
      return 'destructive' as const
    case 'canceled':
    case 'cancelled':
      return 'destructive' as const
    case 'paused':
    default:
      return 'outline' as const
  }
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

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

interface SubscriptionsTableProps {
  filters: SubscriptionListFilters
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onEdit: (subscription: Subscription) => void
  onCancel: (subscription: Subscription) => void
}

const pageSizeOptions = [10, 20, 50]
const skeletonRows = Array.from({ length: 5 }, (_, index) => index)

export function SubscriptionsTable({
  filters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onCancel,
}: SubscriptionsTableProps) {
  const queryFilters = useMemo(
    () => ({
      ...filters,
      page,
      pageSize,
    }),
    [filters, page, pageSize],
  )

  const subscriptionsQuery = useSubscriptions(queryFilters)
  const dataRows = subscriptionsQuery.data?.data ?? []
  const totalPages = subscriptionsQuery.data?.meta?.totalPages ?? 1
  const totalItems = subscriptionsQuery.data?.meta?.totalItems ?? dataRows.length

  const columns = useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        accessorKey: 'planName',
        header: 'Plano',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.planName}</span>
            {row.original.contract?.title ? (
              <span className="text-xs text-muted-foreground">{row.original.contract.title}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'client',
        header: 'Cliente',
        cell: ({ row }) => {
          const clientName =
            row.original.client?.tradeName ??
            row.original.client?.companyName ??
            'Cliente não informado'

          return (
            <div className="flex flex-col">
              <span>{clientName}</span>
              {row.original.clientId ? (
                <span className="text-xs text-muted-foreground">ID: {row.original.clientId}</span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'amount',
        header: 'Valor',
        cell: ({ row }) => formatCurrency(row.original.amount ?? undefined),
      },
      {
        accessorKey: 'billingCycle',
        header: 'Ciclo',
        cell: ({ row }) => cycleLabels[row.original.billingCycle ?? ''] ?? row.original.billingCycle ?? '—',
      },
      {
        accessorKey: 'nextCharge',
        header: 'Próxima cobrança',
        cell: ({ row }) => formatDate(row.original.nextCharge ?? row.original.renewsAt),
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
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const isCanceled = ['canceled', 'cancelled'].includes(String(row.original.status))

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <EllipsisIcon className="size-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <PenSquareIcon className="mr-2 size-4" /> Editar assinatura
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCancel(row.original)}
                  disabled={isCanceled || subscriptionsQuery.isFetching}
                >
                  <BanIcon className="mr-2 size-4" /> Cancelar assinatura
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [onCancel, onEdit, subscriptionsQuery.isFetching],
  )

  const table = useReactTable({
    data: dataRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const showSkeleton = subscriptionsQuery.isLoading && dataRows.length === 0
  const showEmpty = !subscriptionsQuery.isLoading && dataRows.length === 0

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = totalItems === 0 ? 0 : Math.min(totalItems, from + dataRows.length - 1)

  return (
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
                  <TableRow key={`subscription-skeleton-${row}`}>
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
                        Nenhuma assinatura encontrada com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )
                : (
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
          {totalItems === 0
            ? 'Nenhuma assinatura'
            : `Mostrando ${from}-${to} de ${totalItems} assinatura${totalItems === 1 ? '' : 's'}`}
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
