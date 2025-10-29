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

import { SUBSCRIPTION_CYCLE_OPTIONS, SUBSCRIPTION_STATUS_OPTIONS } from '../constants'
import type { Subscription } from '../api'

const subscriptionSchema = z.object({
  planName: z.string().min(1, 'Informe o nome do plano'),
  clientId: z.string().min(1, 'Selecione o cliente'),
  contractId: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  status: z.string().min(1, 'Selecione o status'),
  amount: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined
      const normalized = value.replace(/\./g, '').replace(',', '.')
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : Number.NaN
    })
    .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 0), {
      message: 'Informe um valor válido',
    }),
  billingCycle: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  startedAt: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  renewsAt: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
})

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

interface Option {
  id: string
  name: string
}

interface ContractOption {
  id: string
  clientId: string
  title: string
}

interface SubscriptionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: Subscription | null
  clients: Option[]
  contracts: ContractOption[]
  contractsLoading?: boolean
  isSubmitting?: boolean
  onSubmit: (values: SubscriptionFormValues) => Promise<void> | void
}

const defaultValues: SubscriptionFormValues = {
  planName: '',
  clientId: '',
  contractId: undefined,
  status: SUBSCRIPTION_STATUS_OPTIONS[0]?.value ?? 'active',
  amount: undefined,
  billingCycle: undefined,
  startedAt: undefined,
  renewsAt: undefined,
}

const normalizeSubscriptionToForm = (
  subscription?: Subscription | null,
): SubscriptionFormValues => {
  if (!subscription) return defaultValues

  return {
    planName: subscription.planName ?? '',
    clientId: subscription.clientId ?? '',
    contractId: subscription.contractId ?? undefined,
    status: subscription.status ?? SUBSCRIPTION_STATUS_OPTIONS[0]?.value ?? 'active',
    amount: subscription.amount ?? undefined,
    billingCycle: subscription.billingCycle ?? undefined,
    startedAt: subscription.startedAt ? subscription.startedAt.slice(0, 10) : undefined,
    renewsAt: subscription.nextCharge
      ? subscription.nextCharge.slice(0, 10)
      : subscription.renewsAt
        ? subscription.renewsAt.slice(0, 10)
        : undefined,
  }
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  subscription,
  clients,
  contracts,
  contractsLoading,
  isSubmitting,
  onSubmit,
}: SubscriptionFormDialogProps) {
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues,
  })

  const clientId = useWatch({ control: form.control, name: 'clientId' })

  useEffect(() => {
    if (open) {
      const values = normalizeSubscriptionToForm(subscription)
      form.reset(values)
    }
  }, [form, open, subscription])

  useEffect(() => {
    if (!clientId) {
      form.setValue('contractId', undefined)
      return
    }

    if (contractsLoading) return

    const current = form.getValues('contractId')
    if (current && !contracts.some((contract) => contract.id === current)) {
      form.setValue('contractId', undefined)
    }
  }, [clientId, contracts, contractsLoading, form])

  const contractOptions = useMemo(() => {
    if (!clientId) return contracts
    return contracts.filter((contract) => contract.clientId === clientId)
  }, [clientId, contracts])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Editar assinatura' : 'Nova assinatura'}</DialogTitle>
          <DialogDescription>
            Defina o plano, valores e vínculo contratual da assinatura recorrente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do plano" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('contractId', undefined)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Selecione o cliente</SelectItem>
                          {clients.map((client) => (
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
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value || undefined)}
                        disabled={contractsLoading || contractOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem contrato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem contrato</SelectItem>
                          {contractOptions.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.title}
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBSCRIPTION_STATUS_OPTIONS.map((option) => (
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
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o ciclo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem ciclo definido</SelectItem>
                          {SUBSCRIPTION_CYCLE_OPTIONS.map((option) => (
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={
                          typeof field.value === 'number'
                            ? field.value.toString().replace('.', ',')
                            : field.value ?? ''
                        }
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="renewsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima cobrança</FormLabel>
                  <FormControl>
                    <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="mr-2 size-4" /> : null}
                {subscription ? 'Salvar alterações' : 'Criar assinatura'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
