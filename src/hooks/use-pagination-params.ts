'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface UsePaginationParamsOptions {
  pageParam?: string
  pageSizeParam?: string
  defaultPage?: number
  defaultPageSize?: number
  replace?: boolean
  scroll?: boolean
}

export interface PaginationParams {
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setPagination: (pagination: { page?: number; pageSize?: number }) => void
  resetPagination: () => void
  searchParams: URLSearchParams
}

export function usePaginationParams(options?: UsePaginationParamsOptions): PaginationParams {
  const {
    pageParam = 'page',
    pageSizeParam = 'per_page',
    defaultPage = 1,
    defaultPageSize = 10,
    replace = true,
    scroll = false,
  } = options ?? {}
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = React.useMemo(() => {
    const value = searchParams?.get(pageParam)
    const parsed = value ? Number.parseInt(value, 10) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPage
  }, [defaultPage, pageParam, searchParams])

  const pageSize = React.useMemo(() => {
    const value = searchParams?.get(pageSizeParam)
    const parsed = value ? Number.parseInt(value, 10) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPageSize
  }, [defaultPageSize, pageSizeParam, searchParams])

  const updateSearchParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      const query = params.toString()
      const url = query ? `${pathname}?${query}` : pathname

      if (replace) {
        router.replace(url, { scroll })
      } else {
        router.push(url, { scroll })
      }
    },
    [pathname, replace, router, scroll, searchParams],
  )

  const setPage = React.useCallback(
    (nextPage: number) => {
      const safePage = Number.isFinite(nextPage) ? Math.max(1, Math.floor(nextPage)) : defaultPage
      updateSearchParams({
        [pageParam]: safePage === defaultPage ? null : String(safePage),
      })
    },
    [defaultPage, pageParam, updateSearchParams],
  )

  const setPageSize = React.useCallback(
    (nextPageSize: number) => {
      const safePageSize = Number.isFinite(nextPageSize)
        ? Math.max(1, Math.floor(nextPageSize))
        : defaultPageSize

      updateSearchParams({
        [pageSizeParam]: safePageSize === defaultPageSize ? null : String(safePageSize),
        [pageParam]: null,
      })
    },
    [defaultPageSize, pageParam, pageSizeParam, updateSearchParams],
  )

  const setPagination = React.useCallback(
    ({ page: nextPage, pageSize: nextPageSize }: { page?: number; pageSize?: number }) => {
      const updates: Record<string, string | null> = {}

      if (nextPage !== undefined) {
        const safePage = Number.isFinite(nextPage)
          ? Math.max(1, Math.floor(nextPage))
          : defaultPage
        updates[pageParam] = safePage === defaultPage ? null : String(safePage)
      }

      if (nextPageSize !== undefined) {
        const safePageSize = Number.isFinite(nextPageSize)
          ? Math.max(1, Math.floor(nextPageSize))
          : defaultPageSize
        updates[pageSizeParam] =
          safePageSize === defaultPageSize ? null : String(safePageSize)

        if (nextPage === undefined) {
          updates[pageParam] = null
        }
      }

      updateSearchParams(updates)
    },
    [defaultPage, defaultPageSize, pageParam, pageSizeParam, updateSearchParams],
  )

  const resetPagination = React.useCallback(() => {
    updateSearchParams({
      [pageParam]: null,
      [pageSizeParam]: null,
    })
  }, [pageParam, pageSizeParam, updateSearchParams])

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    setPagination,
    resetPagination,
    searchParams: new URLSearchParams(searchParams?.toString()),
  }
}
