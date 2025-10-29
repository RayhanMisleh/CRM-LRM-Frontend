'use client'

import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

import { INVOICE_STATUS_OPTIONS } from '../constants'
import type { Invoice } from '../api'

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Selecione o cliente'),
  contractId: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  number: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  description: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Informe o valor da fatura' })
    .min(0.01, 'Informe um valor maior que zero'),
  currency: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  issueDate: z.string().min(1, 'Informe a data de emissão'),
  dueDate: z.string().min(1, 'Informe a data de vencimento'),
  status: z.string().min(1, 'Selecione o status'),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
  clients: Array<{ id: string; name: string }>
  contracts: Array<{ id: string; title: string; clientId?: string | null }>
  isSubmitting?: boolean
  onSubmit: (values: InvoiceFormValues) => Promise<void> | void
}

const defaultValues: InvoiceFormValues = {
  clientId: '',
  contractId: undefined,
  number: undefined,
  description: undefined,
  amount: 0,
  currency: 'BRL',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  status: INVOICE_STATUS_OPTIONS[0]?.value ?? 'pending',
}

const normalizeInvoiceToForm = (invoice?: Invoice | null): InvoiceFormValues => {
  if (!invoice) return defaultValues

  return {
    clientId: invoice.clientId,
    contractId: invoice.contractId ?? undefined,
    number: invoice.number ?? undefined,
    description: invoice.description ?? undefined,
    amount: invoice.amount ?? 0,
    currency: invoice.currency ?? 'BRL',
    issueDate: invoice.issueDate ? invoice.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: invoice.status ?? INVOICE_STATUS_OPTIONS[0]?.value ?? 'pending',
  }
}

const formatCurrency = (value?: number, currency: string = 'BRL') => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '—'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  clients,
  contracts,
  isSubmitting = false,
  onSubmit,
}: InvoiceFormDialogProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(normalizeInvoiceToForm(invoice))
    }
  }, [form, invoice, open])

  const clientOptions = useMemo(() => clients, [clients])
  const contractsOptions = useMemo(() => contracts, [contracts])

  const watchedValues = useWatch({ control: form.control })
  const selectedClientId = watchedValues?.clientId
  const currency = watchedValues?.currency ?? 'BRL'

  const filteredContracts = useMemo(() => {
    if (!selectedClientId) return contractsOptions
    return contractsOptions.filter((contract) => !contract.clientId || contract.clientId === selectedClientId)
  }, [contractsOptions, selectedClientId])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Editar fatura' : 'Nova fatura manual'}</DialogTitle>
          <DialogDescription>
            Defina cliente, contrato e condições de cobrança para gerar uma fatura manual.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger className="rounded-2xl border-white/20 bg-white/10 text-white">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-white/20 bg-background/95 backdrop-blur">
                      {clientOptions.length === 0 ? (
                        <SelectItem value="" disabled>
                          Nenhum cliente disponível
                        </SelectItem>
                      ) : (
                        clientOptions.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrato (opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value || undefined)}
                    value={field.value ?? ''}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-2xl border-white/20 bg-white/10 text-white">
                        <SelectValue placeholder="Vincular a um contrato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-white/20 bg-background/95 backdrop-blur">
                      <SelectItem value="">Sem contrato vinculado</SelectItem>
                      {filteredContracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Opcional: vincule a fatura a um contrato existente.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da fatura</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 2024-001"
                        className="rounded-2xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moeda</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={3}
                        className="rounded-2xl border-white/20 bg-white/10 text-white uppercase"
                        onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>Utilize o código ISO da moeda (ex: BRL).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Detalhes sobre os serviços faturados"
                      className="rounded-2xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        className="rounded-2xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      {formatCurrency(Number(field.value ?? 0), currency)}
                    </FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger className="rounded-2xl border-white/20 bg-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-white/20 bg-background/95 backdrop-blur">
                        {INVOICE_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de emissão</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="rounded-2xl border-white/20 bg-white/10 text-white"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de vencimento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="rounded-2xl border-white/20 bg-white/10 text-white"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl" disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-2xl" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" /> Salvando
                  </span>
                ) : invoice ? (
                  'Salvar alterações'
                ) : (
                  'Emitir fatura'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
