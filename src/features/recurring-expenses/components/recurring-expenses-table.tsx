'use client'

import { useMemo } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { EllipsisIcon, PlayCircleIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import type { RecurringExpense } from '../api'

const statusVariant = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase()
  switch (normalized) {
    case 'active':
      return 'default' as const
    case 'paused':
      return 'secondary' as const
    case 'cancelled':
    case 'canceled':
      return 'outline' as const
    default:
      return 'outline' as const
  }
}

const statusLabel = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase()
  switch (normalized) {
    case 'active':
      return 'Ativa'
    case 'paused':
      return 'Pausada'
    case 'cancelled':
    case 'canceled':
      return 'Cancelada'
    default:
      return status ?? '—'
  }
}

const frequencyLabel = (frequency?: string | null) => {
  const normalized = String(frequency ?? '').toLowerCase()
  switch (normalized) {
    case 'weekly':
      return 'Semanal'
    case 'monthly':
      return 'Mensal'
    case 'quarterly':
      return 'Trimestral'
    case 'yearly':
      return 'Anual'
    default:
      return frequency ?? '—'
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

interface RecurringExpensesTableProps {
  data: RecurringExpense[]
  isLoading?: boolean
  isFetching?: boolean
  onGenerate?: (expense: RecurringExpense) => void
  generatingId?: string | null
}

const skeletonRows = Array.from({ length: 5 }, (_, index) => index)

export function RecurringExpensesTable({
  data,
  isLoading,
  isFetching,
  onGenerate,
  generatingId,
}: RecurringExpensesTableProps) {
  const columns = useMemo<ColumnDef<RecurringExpense>[]>(
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
        accessorKey: 'frequency',
        header: 'Recorrência',
        cell: ({ row }) => frequencyLabel(row.original.frequency),
      },
      {
        accessorKey: 'costCenter',
        header: 'Centro de custo',
        cell: ({ row }) => row.original.costCenter ?? '—',
      },
      {
        accessorKey: 'nextDueDate',
        header: 'Próximo vencimento',
        cell: ({ row }) => formatDate(row.original.nextDueDate),
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
        header: 'Valor base',
        cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency ?? 'BRL'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const expense = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <EllipsisIcon className="size-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => onGenerate?.(expense)}
                  disabled={Boolean(generatingId) || isFetching}
                >
                  <PlayCircleIcon className="mr-2 size-4" /> Gerar lançamento agora
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [generatingId, isFetching, onGenerate],
  )

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  if (!isLoading && data.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Nenhuma despesa recorrente cadastrada.
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
                Nenhuma despesa recorrente encontrada.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {isFetching ? <div className="p-3 text-center text-xs text-muted-foreground">Atualizando dados...</div> : null}
    </div>
  )
}
