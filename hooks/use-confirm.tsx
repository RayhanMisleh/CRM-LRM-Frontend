'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

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
import { cn } from '@/lib/utils'

interface ConfirmDialogOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'default' | 'destructive'
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean
}

interface ConfirmDialogContextValue {
  confirm: (options?: ConfirmDialogOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(
  undefined,
)

const defaultState: ConfirmDialogState = {
  open: false,
  title: 'Tem certeza?',
  description: undefined,
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  confirmVariant: 'default',
}

export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmDialogState>(defaultState)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const openDialog = useCallback((options: ConfirmDialogOptions = {}) => {
    setState({ ...defaultState, ...options, open: true })
  }, [])

  const closeDialog = useCallback(() => {
    setState((previous) => ({ ...previous, open: false }))
  }, [])

  const confirm = useCallback(
    (options: ConfirmDialogOptions = {}) => {
      openDialog(options)

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
      })
    },
    [openDialog],
  )

  const resolve = useCallback(
    (value: boolean) => {
      const resolver = resolverRef.current
      resolverRef.current = null
      closeDialog()
      resolver?.(value)
    },
    [closeDialog],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && resolverRef.current) {
        resolve(false)
      } else {
        setState((previous) => ({ ...previous, open }))
      }
    },
    [resolve],
  )

  const handleConfirm = useCallback(() => {
    resolve(true)
  }, [resolve])

  const handleCancel = useCallback(() => {
    resolve(false)
  }, [resolve])

  const contextValue = useMemo<ConfirmDialogContextValue>(() => ({ confirm }), [confirm])

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            {state.description ? (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>{state.cancelText}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                state.confirmVariant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined,
              )}
              onClick={handleConfirm}
            >
              {state.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider')
  }
  return context.confirm
}
