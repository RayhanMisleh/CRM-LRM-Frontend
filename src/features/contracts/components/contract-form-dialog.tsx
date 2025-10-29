'use client'

import { useEffect, useMemo, useRef, type ChangeEventHandler } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/hooks/use-toast'

import {
  CONTRACT_BILLING_CYCLE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
} from '../constants'
import { useUploadContractFile, type Contract } from '../api'

const contractSchema = z.object({
  title: z.string().min(1, 'Informe o título do contrato'),
  clientId: z.string().min(1, 'Selecione o cliente'),
  status: z.string().min(1, 'Informe o status'),
  totalValue: z
    .coerce
    .number()
    .optional()
    .or(z.nan())
    .transform((value) => (Number.isFinite(value) ? value : undefined)),
  billingCycle: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  signedAt: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  validUntil: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  arquivoPdfUrl: z
    .string()
    .url('Informe uma URL válida')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
})

export type ContractFormValues = z.infer<typeof contractSchema>

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract?: Contract | null
  clients?: Array<{ id: string; name: string }>
  isSubmitting?: boolean
  onSubmit: (values: ContractFormValues) => Promise<void> | void
}

const defaultValues: ContractFormValues = {
  title: '',
  clientId: '',
  status: CONTRACT_STATUS_OPTIONS[0]?.value ?? 'draft',
  totalValue: undefined,
  billingCycle: undefined,
  signedAt: undefined,
  validUntil: undefined,
  arquivoPdfUrl: undefined,
}

const normalizeContractToForm = (contract?: Contract | null): ContractFormValues => {
  if (!contract) return defaultValues

  return {
    title: contract.title ?? '',
    clientId: contract.clientId ?? '',
    status: contract.status ?? CONTRACT_STATUS_OPTIONS[0]?.value ?? 'draft',
    totalValue: contract.totalValue ?? undefined,
    billingCycle: contract.billingCycle ?? undefined,
    signedAt: contract.signedAt ? contract.signedAt.slice(0, 10) : undefined,
    validUntil: contract.validUntil ? contract.validUntil.slice(0, 10) : undefined,
    arquivoPdfUrl: contract.arquivoPdfUrl ?? undefined,
  }
}

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  clients,
  isSubmitting,
  onSubmit,
}: ContractFormDialogProps) {
  const upload = useUploadContractFile()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      const values = normalizeContractToForm(contract)
      form.reset(values)
    }
  }, [contract, form, open])

  const clientOptions = useMemo(() => clients ?? [], [clients])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      totalValue: values.totalValue ?? undefined,
    })
  })

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (
    event,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Envie um arquivo PDF.',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await upload.mutateAsync(file)
      form.setValue('arquivoPdfUrl', result.url)
      toast({
        title: 'Upload concluído',
        description: 'Arquivo anexado com sucesso.',
      })
    } catch (error) {
      const message =
        (error as Error)?.message ?? 'Não foi possível enviar o arquivo. Tente novamente.'
      toast({
        title: 'Erro no upload',
        description: message,
        variant: 'destructive',
      })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{contract ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
          <DialogDescription>
            Defina informações gerais, status e arquivo do contrato do cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Contrato de prestação de serviços" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                        disabled={clientOptions.length === 0}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientOptions.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="totalValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor total (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const next = event.target.value
                          field.onChange(next ? Number(next) : undefined)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de cobrança</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value || undefined)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem recorrência</SelectItem>
                          {CONTRACT_BILLING_CYCLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="signedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assinado em</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido até</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="arquivoPdfUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivo PDF</FormLabel>
                  <FormDescription>
                    Envie um arquivo PDF ou informe o link público para o documento.
                  </FormDescription>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/contrato.pdf"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={upload.isPending}
                    >
                      {upload.isPending ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" /> Enviando...
                        </span>
                      ) : (
                        'Enviar arquivo'
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || upload.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || upload.isPending}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" /> Salvando...
                  </span>
                ) : contract ? (
                  'Atualizar contrato'
                ) : (
                  'Criar contrato'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
