'use client'

import { useEffect, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface MiniTableEmptyState {
  title: string
  description?: string
}

export interface MiniTableAction {
  label: string
  onClick: () => void
}

export interface MiniTableProps<TData> {
  title: string
  description?: string
  columns: ColumnDef<TData, any>[]
  data?: TData[]
  isLoading?: boolean
  emptyState?: MiniTableEmptyState
  action?: MiniTableAction
  pageSize?: number
  onRowClick?: (row: TData) => void
}

const DEFAULT_PAGE_SIZE = 5

export function MiniTable<TData>({
  title,
  description,
  columns,
  data = [],
  isLoading = false,
  emptyState,
  action,
  pageSize = DEFAULT_PAGE_SIZE,
  onRowClick,
}: MiniTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  useEffect(() => {
    setPagination((previous) => ({ ...previous, pageSize }))
  }, [pageSize])

  useEffect(() => {
    setPagination((previous) => {
      const totalRows = data.length
      const pageCount = Math.max(1, Math.ceil(totalRows / previous.pageSize))
      if (previous.pageIndex < pageCount) return previous
      return { ...previous, pageIndex: 0 }
    })
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  })

  const showPagination = data.length > pagination.pageSize
  const hasData = data.length > 0

  return (
    <Card className="flex h-full flex-col rounded-3xl border border-white/15 bg-white/10 p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description ? <p className="text-sm text-white/60">{description}</p> : null}
        </div>
        {action ? (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-2xl text-white/80 transition hover:bg-white/10"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </div>

      <div className="mt-6 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: pagination.pageSize }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-2xl bg-white/15" />
            ))}
          </div>
        ) : hasData ? (
          <div className="space-y-3">
            <Table className="text-white/80">
              <TableHeader className="text-white/60">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-white/10">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs uppercase tracking-wide text-white/60">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'border-white/10 transition',
                      onRowClick ? 'cursor-pointer hover:bg-white/10' : undefined,
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-sm text-white/80">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {showPagination ? (
              <div className="flex items-center justify-end gap-3 text-xs text-white/60">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-white/70 hover:bg-white/10"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <span>
                  Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-white/70 hover:bg-white/10"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        ) : emptyState ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-white/70">
            <h4 className="text-base font-semibold text-white">{emptyState.title}</h4>
            {emptyState.description ? (
              <p className="mt-2 max-w-sm text-sm text-white/60">{emptyState.description}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/70">
            Nenhum registro encontrado.
          </div>
        )}
      </div>
    </Card>
  )
}
