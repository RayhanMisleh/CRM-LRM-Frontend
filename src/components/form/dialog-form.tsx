'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { type z, type ZodTypeAny } from 'zod'
import {
  useForm,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form'

import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Spinner } from '@/components/ui/spinner'

type ToastContent = {
  title?: React.ReactNode
  description?: React.ReactNode
}

export interface DialogFormProps<TSchema extends ZodTypeAny> {
  schema: TSchema
  defaultValues?: UseFormProps<z.infer<TSchema>>['defaultValues']
  onSubmit: (
    values: z.infer<TSchema>,
    form: UseFormReturn<z.infer<TSchema>>,
  ) => Promise<void> | void
  open: boolean
  onOpenChange: (open: boolean) => void
  children: (form: UseFormReturn<z.infer<TSchema>>) => React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  submitLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  successToast?: ToastContent | false
  errorToast?: ToastContent | false
  dialogProps?: Omit<React.ComponentProps<typeof Dialog>, 'open' | 'onOpenChange'>
  contentProps?: React.ComponentProps<typeof DialogContent>
  submitButtonProps?: ButtonProps
  cancelButtonProps?: ButtonProps
  shouldCloseOnSuccess?: boolean
  shouldResetOnClose?: boolean
  className?: string
}

const defaultSuccessToast: ToastContent = {
  title: 'Tudo certo!',
  description: 'As informações foram salvas com sucesso.',
}

const defaultErrorToast: ToastContent = {
  title: 'Algo deu errado',
  description: 'Não foi possível concluir a ação. Tente novamente.',
}

export function DialogForm<TSchema extends ZodTypeAny>({
  schema,
  defaultValues,
  onSubmit,
  open,
  onOpenChange,
  children,
  title,
  description,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  successToast = defaultSuccessToast,
  errorToast = defaultErrorToast,
  dialogProps,
  contentProps,
  submitButtonProps,
  cancelButtonProps,
  shouldCloseOnSuccess = true,
  shouldResetOnClose = true,
  className,
}: DialogFormProps<TSchema>) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const latestDefaultValues = React.useRef(defaultValues)
  const { disabled: submitDisabled, ...restSubmitButtonProps } = submitButtonProps ?? {}
  const { disabled: cancelDisabled, ...restCancelButtonProps } = cancelButtonProps ?? {}

  React.useEffect(() => {
    latestDefaultValues.current = defaultValues
  }, [defaultValues])

  React.useEffect(() => {
    if (open && latestDefaultValues.current) {
      form.reset(latestDefaultValues.current)
    }
  }, [form, open])

  const handleClose = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && shouldResetOnClose) {
        form.reset(latestDefaultValues.current)
      }

      onOpenChange(nextOpen)
    },
    [form, onOpenChange, shouldResetOnClose],
  )

  const handleSubmit = React.useMemo(
    () =>
      form.handleSubmit(async (values) => {
        setIsSubmitting(true)

        try {
          await onSubmit(values, form)

          if (successToast) {
            toast({
              title: successToast.title,
              description: successToast.description,
            })
          }

          if (shouldCloseOnSuccess) {
            handleClose(false)
          }
        } catch (error) {
          const description =
            errorToast?.description ?? (error instanceof Error ? error.message : undefined)

          if (errorToast !== false) {
            toast({
              title: errorToast?.title ?? defaultErrorToast.title,
              description: description ?? defaultErrorToast.description,
              variant: 'destructive',
            })
          }
        } finally {
          setIsSubmitting(false)
        }
      }) as SubmitHandler<z.infer<TSchema>>,
    [
      errorToast,
      form,
      handleClose,
      onSubmit,
      shouldCloseOnSuccess,
      successToast,
    ],
  )

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent {...contentProps}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className={cn('grid gap-6', className)}
            autoComplete="off"
          >
            {children(form)}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || cancelDisabled}
                onClick={() => handleClose(false)}
                {...restCancelButtonProps}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || submitDisabled}
                {...restSubmitButtonProps}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Salvando...
                  </span>
                ) : (
                  submitLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
