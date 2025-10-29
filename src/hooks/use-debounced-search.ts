'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface UseDebouncedSearchOptions {
  delay?: number
  paramName?: string
  initialValue?: string
  syncWithUrl?: boolean
  replace?: boolean
  scroll?: boolean
  minLength?: number
}

export interface UseDebouncedSearchResult {
  term: string
  debouncedTerm: string
  setTerm: React.Dispatch<React.SetStateAction<string>>
  isDebouncing: boolean
  clear: () => void
}

export function useDebouncedSearch(
  options?: UseDebouncedSearchOptions,
): UseDebouncedSearchResult {
  const {
    delay = 400,
    paramName,
    initialValue,
    syncWithUrl = true,
    replace = true,
    scroll = false,
    minLength = 0,
  } = options ?? {}
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialUrlValue = React.useMemo(() => {
    if (!paramName) {
      return ''
    }

    return searchParams?.get(paramName) ?? ''
  }, [paramName, searchParams])

  const [term, setTermState] = React.useState(initialValue ?? initialUrlValue)
  const [debouncedTerm, setDebouncedTerm] = React.useState(initialValue ?? initialUrlValue)

  const updateUrl = React.useCallback(
    (value: string) => {
      if (!paramName) return

      const params = new URLSearchParams(searchParams?.toString())
      if (!value) {
        params.delete(paramName)
      } else {
        params.set(paramName, value)
      }

      const query = params.toString()
      const url = query ? `${pathname}?${query}` : pathname

      if (replace) {
        router.replace(url, { scroll })
      } else {
        router.push(url, { scroll })
      }
    },
    [paramName, pathname, replace, router, scroll, searchParams],
  )

  React.useEffect(() => {
    if (!paramName) return
    const urlValue = searchParams?.get(paramName) ?? ''
    if (urlValue !== term) {
      setTermState(urlValue)
      setDebouncedTerm(urlValue)
    }
  }, [paramName, searchParams, term])

  React.useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedTerm(term)
    }, delay)

    return () => {
      window.clearTimeout(handler)
    }
  }, [delay, term])

  React.useEffect(() => {
    if (!syncWithUrl || !paramName) {
      return
    }

    const shouldSyncValue =
      minLength > 0 && debouncedTerm.length > 0 && debouncedTerm.length < minLength
        ? ''
        : debouncedTerm

    updateUrl(shouldSyncValue)
  }, [debouncedTerm, minLength, paramName, syncWithUrl, updateUrl])

  const setTerm = React.useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTermState((prev) => {
      const nextValue = typeof value === 'function' ? value(prev) : value
      return nextValue
    })
  }, [])

  const clear = React.useCallback(() => {
    setTermState('')
    setDebouncedTerm('')
    if (syncWithUrl && paramName) {
      updateUrl('')
    }
  }, [paramName, syncWithUrl, updateUrl])

  const isDebouncing = term !== debouncedTerm

  return {
    term,
    debouncedTerm,
    setTerm,
    isDebouncing,
    clear,
  }
}
