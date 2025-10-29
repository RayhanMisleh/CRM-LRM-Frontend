'use client'

import { useMemo } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import type { Expense } from '../api'

const statusVariant = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase()
  switch (normalized) {
    case 'paid':
      return 'default' as const
    case 'pending':
    case 'scheduled':
      return 'secondary' as const
    case 'overdue':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

const statusLabel = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase()
  switch (normalized) {
    case 'paid':
      return 'Pago'
    case 'pending':
      return 'Pendente'
    case 'overdue':
      return 'Atrasado'
    case 'scheduled':
      return 'Programado'
    default:
      return status ?? '—'
  }
}

const formatCurrency = (value?: number | null, currency: string = 'BRL') => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  try {
    return format(parsed, 'dd/MM/yyyy')
  } catch {
    return '—'
  }
}

interface ExpensesTableProps {
  data: Expense[]
  isLoading?: boolean
  isFetching?: boolean
}

const skeletonRows = Array.from({ length: 6 }, (_, index) => index)

export function ExpensesTable({ data, isLoading, isFetching }: ExpensesTableProps) {
  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Descrição',
        cell: ({ row }) => {
          const expense = row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{expense.title}</span>
              {expense.description ? (
                <span className="text-xs text-muted-foreground">{expense.description}</span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => row.original.type ?? '—',
      },
      {
        accessorKey: 'costCenter',
        header: 'Centro de custo',
        cell: ({ row }) => row.original.costCenter ?? '—',
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
          <Badge variant={statusVariant(row.original.status)} className="capitalize">
            {statusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Valor',
        cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency ?? 'BRL'),
      },
    ],
    [],
  )

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  if (!isLoading && data.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Nenhuma despesa encontrada com os filtros selecionados.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/60">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs uppercase tracking-wide text-muted-foreground">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading
            ? skeletonRows.map((row) => (
                <TableRow key={row}>
                  {columns.map((column) => (
                    <TableCell key={String(column.id ?? column.accessorKey)}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
          {!isLoading && table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                Nenhuma despesa encontrada.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {isFetching ? <div className="p-3 text-center text-xs text-muted-foreground">Atualizando dados...</div> : null}
    </div>
  )
}
