'use client'

import { useMemo } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { EllipsisIcon, PenSquareIcon, CheckCircle2Icon } from 'lucide-react'

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

import { INVOICE_STATUS_OPTIONS } from '../constants'
import { useInvoices, type Invoice, type InvoiceListFilters } from '../api'

const statusLabels = INVOICE_STATUS_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'default' as const
    case 'pending':
      return 'secondary' as const
    case 'overdue':
      return 'destructive' as const
    case 'cancelled':
    case 'canceled':
      return 'outline' as const
    case 'draft':
    default:
      return 'outline' as const
  }
}

const formatCurrency = (value?: number | null, currency: string = 'BRL') => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
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

interface InvoicesTableProps {
  filters: InvoiceListFilters
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onEdit: (invoice: Invoice) => void
  onMarkAsPaid: (invoice: Invoice) => void
  isProcessing?: boolean
}

const pageSizeOptions = [10, 20, 50]
const skeletonRows = Array.from({ length: 5 }, (_, index) => index)

export function InvoicesTable({
  filters,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onMarkAsPaid,
  isProcessing = false,
}: InvoicesTableProps) {
  const queryFilters = useMemo(
    () => ({
      ...filters,
      page,
      pageSize,
    }),
    [filters, page, pageSize],
  )

  const invoicesQuery = useInvoices(queryFilters)
  const dataRows = invoicesQuery.data?.data ?? []
  const totalPages = invoicesQuery.data?.meta?.totalPages ?? 1
  const totalItems = invoicesQuery.data?.meta?.totalItems ?? dataRows.length
  const currency = dataRows[0]?.currency ?? 'BRL'

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: 'number',
        header: 'Fatura',
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{item.number ?? 'Sem número'}</span>
              <span className="text-xs text-muted-foreground">
                Emitida em {formatDate(item.issueDate)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'client',
        header: 'Cliente',
        cell: ({ row }) => {
          const item = row.original
          const clientName = item.client?.tradeName ?? item.client?.companyName ?? 'Cliente não informado'
          return (
            <div className="flex flex-col">
              <span>{clientName}</span>
              <span className="text-xs text-muted-foreground">ID: {item.clientId}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'contract',
        header: 'Contrato',
        cell: ({ row }) => row.original.contract?.title ?? '—',
      },
      {
        accessorKey: 'clientService',
        header: 'Serviço',
        cell: ({ row }) => row.original.clientService?.name ?? '—',
      },
      {
        accessorKey: 'serviceBilling',
        header: 'Cobrança',
        cell: ({ row }) => {
          const billing = row.original.serviceBilling
          if (!billing) return '—'
          return `${billing.cycle ?? ''}${billing.status ? ` · ${billing.status}` : ''}`.trim()
        },
      },
      {
        accessorKey: 'amount',
        header: 'Valor',
        cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency ?? currency),
      },
      {
        accessorKey: 'dueDate',
        header: 'Vencimento',
        cell: ({ row }) => formatDate(row.original.dueDate),
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
          const invoice = row.original
          const isPaid = String(invoice.status).toLowerCase() === 'paid'
          const isCancelled = ['cancelled', 'canceled'].includes(String(invoice.status).toLowerCase())

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <EllipsisIcon className="size-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(invoice)}>
                  <PenSquareIcon className="mr-2 size-4" /> Editar fatura
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onMarkAsPaid(invoice)}
                  disabled={isPaid || isCancelled || isProcessing || invoicesQuery.isFetching}
                >
                  <CheckCircle2Icon className="mr-2 size-4" /> Marcar como paga
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [currency, invoicesQuery.isFetching, isProcessing, onEdit, onMarkAsPaid],
  )

  const table = useReactTable({
    data: dataRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const showSkeleton = invoicesQuery.isLoading && dataRows.length === 0
  const showEmpty = !invoicesQuery.isLoading && dataRows.length === 0

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
              ? skeletonRows.map((key) => (
                  <TableRow key={`skeleton-${key}`}>
                    {table.getAllColumns().map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton className="h-4 w-full rounded-full bg-white/10" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : showEmpty
                ? (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center text-sm text-muted-foreground">
                      Nenhuma fatura encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )
                : table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <div>
          Exibindo {from} - {to} de {totalItems} faturas
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-9 w-[130px] rounded-2xl border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Itens por página" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-white/15 bg-background/95 backdrop-blur">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    onPageChange(Math.max(1, page - 1))
                  }}
                  className="rounded-2xl border-white/15 bg-white/10 text-white"
                  aria-disabled={page <= 1}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        onPageChange(pageNumber)
                      }}
                      isActive={pageNumber === page}
                      className="rounded-2xl border-white/10 bg-white/5 text-white"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    onPageChange(Math.min(totalPages, page + 1))
                  }}
                  className="rounded-2xl border-white/15 bg-white/10 text-white"
                  aria-disabled={page >= totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
