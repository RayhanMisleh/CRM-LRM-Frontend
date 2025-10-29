'use client'

import { type ReactNode, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { getQueryClient } from '@/lib/query-client'
import { ConfirmDialogProvider } from '@/hooks/use-confirm'

interface ProvidersProps {
  children: ReactNode
}

export const Providers = ({ children }: ProvidersProps) => {
  const [queryClient] = useState(getQueryClient)

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ConfirmDialogProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors closeButton />
          {process.env.NODE_ENV !== 'production' ? (
            <ReactQueryDevtools initialIsOpen={false} position="right" />
          ) : null}
        </QueryClientProvider>
      </ConfirmDialogProvider>
    </ThemeProvider>
  )
}
