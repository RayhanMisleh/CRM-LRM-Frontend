'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
  type TableState,
  type VisibilityState,
} from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type DataTableState = Partial<
  Pick<
    TableState,
    'sorting' | 'columnFilters' | 'pagination' | 'globalFilter' | 'columnVisibility' | 'rowSelection'
  >
>

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount?: number
  totalItems?: number
  state?: DataTableState
  onSortingChange?: OnChangeFn<SortingState>
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  onPaginationChange?: OnChangeFn<PaginationState>
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  onGlobalFilterChange?: OnChangeFn<string>
  renderToolbar?: (table: Table<TData>) => React.ReactNode
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode
  isLoading?: boolean
  emptyMessage?: string
  className?: string
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalItems,
  state,
  onSortingChange,
  onColumnFiltersChange,
  onPaginationChange,
  onColumnVisibilityChange,
  onRowSelectionChange,
  onGlobalFilterChange,
  renderToolbar,
  renderSubComponent,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  className,
  manualPagination,
  manualSorting,
  manualFiltering,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination,
    manualSorting,
    manualFiltering,
    state: {
      sorting: state?.sorting,
      columnFilters: state?.columnFilters,
      pagination: state?.pagination,
      columnVisibility: state?.columnVisibility,
      rowSelection: state?.rowSelection,
      globalFilter: state?.globalFilter,
    },
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
    onColumnVisibilityChange,
    onRowSelectionChange,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {renderToolbar ? renderToolbar(table) : null}
      <div className="rounded-lg border">
        <UiTable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Spinner />
                    <span>Carregando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderSubComponent ? (
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={row.getVisibleCells().length}>
                        {renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UiTable>
      </div>
      <DataTablePagination table={table} totalItems={totalItems} />
    </div>
  )
}

export interface DataTablePaginationProps<TData> {
  table: Table<TData>
  totalItems?: number
  className?: string
}

export function DataTablePagination<TData>({
  table,
  totalItems,
  className,
}: DataTablePaginationProps<TData>) {
  const pagination = table.getState().pagination ?? { pageIndex: 0, pageSize: table.getRowModel().rows.length }
  const pageIndex = pagination?.pageIndex ?? 0
  const pageSize = pagination?.pageSize ?? table.getRowModel().rows.length
  const pageRows = table.getRowModel().rows.length
  const canPreviousPage = table.getCanPreviousPage()
  const canNextPage = table.getCanNextPage()
  const total = React.useMemo(() => {
    if (typeof totalItems === 'number') {
      return totalItems
    }

    if (!table.options.manualPagination) {
      return table.getFilteredRowModel().rows.length
    }

    return pageIndex * pageSize + pageRows
  }, [pageIndex, pageRows, pageSize, table, totalItems])

  const from = total === 0 ? 0 : pageIndex * pageSize + (pageRows > 0 ? 1 : 0)
  const to = pageIndex * pageSize + pageRows
  const toDisplay = typeof totalItems === 'number' ? Math.min(totalItems, to) : to
  const currentPage = pageIndex + 1

  return (
    <div
      className={cn(
        'flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="text-muted-foreground text-sm">
        {total === 0
          ? 'Nenhum resultado.'
          : `Mostrando ${from}-${toDisplay} de ${total} registro${total === 1 ? '' : 's'}`}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!canPreviousPage}
        >
          Primeiro
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!canPreviousPage}
        >
          Anterior
        </Button>
        <div className="text-sm font-medium text-foreground">
          Página {currentPage} de {pageCountText(table)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!canNextPage}
        >
          Próxima
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
          disabled={!canNextPage}
        >
          Última
        </Button>
      </div>
    </div>
  )
}

function pageCountText<TData>(table: Table<TData>) {
  if (table.options.manualPagination && table.options.pageCount !== undefined) {
    return table.options.pageCount
  }

  const pageCount = table.getPageCount()
  return pageCount === 0 ? 1 : pageCount
}

export interface DataTableToolbarProps {
  children?: React.ReactNode
  className?: string
}

export function DataTableToolbar({ children, className }: DataTableToolbarProps) {
  if (!children) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}
