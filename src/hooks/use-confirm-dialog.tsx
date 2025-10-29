'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type ConfirmDialogTone = 'default' | 'destructive'

export interface ConfirmDialogOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  tone?: ConfirmDialogTone
  cancelProps?: React.ComponentProps<typeof AlertDialogCancel>
  confirmProps?: React.ComponentProps<typeof AlertDialogAction>
}

interface UseConfirmDialogReturn {
  confirm: (options?: ConfirmDialogOptions) => Promise<boolean>
  ConfirmDialog: () => JSX.Element
  isOpen: boolean
}

const DEFAULT_OPTIONS: Required<Pick<ConfirmDialogOptions, 'title' | 'description' | 'confirmLabel' | 'cancelLabel' | 'tone'>> = {
  title: 'Tem certeza?',
  description: 'Essa ação não poderá ser desfeita.',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  tone: 'default',
}

export function useConfirmDialog(
  defaultOptions?: ConfirmDialogOptions,
): UseConfirmDialogReturn {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<ConfirmDialogOptions>(() => ({
    ...DEFAULT_OPTIONS,
    ...defaultOptions,
  }))
  const resolverRef = React.useRef<(value: boolean) => void>()
  const skipCloseRef = React.useRef(false)

  React.useEffect(() => {
    if (defaultOptions) {
      setOptions((current) => ({
        ...DEFAULT_OPTIONS,
        ...defaultOptions,
        ...current,
      }))
    }
  }, [defaultOptions])

  React.useEffect(() => {
    return () => {
      if (resolverRef.current) {
        const resolver = resolverRef.current
        resolverRef.current = undefined
        resolver(false)
      }
    }
  }, [])

  const close = React.useCallback((result: boolean) => {
    const resolver = resolverRef.current
    resolverRef.current = undefined
    skipCloseRef.current = true
    setOpen(false)
    resolver?.(result)
  }, [])

  const confirm = React.useCallback(
    (overrideOptions?: ConfirmDialogOptions) => {
      setOptions({ ...DEFAULT_OPTIONS, ...defaultOptions, ...overrideOptions })
      setOpen(true)
      skipCloseRef.current = false

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
      })
    },
    [defaultOptions],
  )

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (skipCloseRef.current) {
          skipCloseRef.current = false
          return
        }

        if (resolverRef.current) {
          const resolver = resolverRef.current
          resolverRef.current = undefined
          resolver(false)
        }

        setOpen(false)
      } else {
        setOpen(true)
      }
    },
    [],
  )

  const handleCancel = React.useCallback(() => {
    close(false)
  }, [close])

  const handleConfirm = React.useCallback(() => {
    close(true)
  }, [close])

  const ConfirmDialog = React.useCallback(() => {
    const tone = options.tone ?? DEFAULT_OPTIONS.tone
    const { className: cancelClassNameProp, onClick: cancelOnClick, ...restCancelProps } =
      options.cancelProps ?? {}
    const { className: confirmClassNameProp, onClick: confirmOnClick, ...restConfirmProps } =
      options.confirmProps ?? {}
    const confirmClassName = cn(
      buttonVariants({ variant: tone === 'destructive' ? 'destructive' : 'default' }),
      confirmClassNameProp,
    )
    const cancelClassName = cn(cancelClassNameProp)

    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {options.title ? <AlertDialogTitle>{options.title}</AlertDialogTitle> : null}
            {options.description ? (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(event) => {
                cancelOnClick?.(event)
                if (!event.defaultPrevented) {
                  handleCancel()
                }
              }}
              className={cancelClassName}
              {...restCancelProps}
            >
              {options.cancelLabel ?? DEFAULT_OPTIONS.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                confirmOnClick?.(event)
                if (!event.defaultPrevented) {
                  handleConfirm()
                }
              }}
              className={confirmClassName}
              {...restConfirmProps}
            >
              {options.confirmLabel ?? DEFAULT_OPTIONS.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }, [handleCancel, handleConfirm, handleOpenChange, open, options])

  return {
    confirm,
    ConfirmDialog,
    isOpen: open,
  }
}
