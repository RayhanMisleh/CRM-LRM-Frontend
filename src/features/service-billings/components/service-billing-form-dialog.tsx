'use client'

import { useEffect } from 'react'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

import {
  useClientServices,
  type ClientService,
} from '@/features/client-services/api'
import type { ServiceBilling } from '@/features/service-billings/api'

const statusOptions = [
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'ended', label: 'Encerrada' },
]

const cycleOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'yearly', label: 'Anual' },
]

const serviceCategoryLabels = {
  APPS: 'Apps',
  SITES: 'Sites',
  SOFTWARE: 'Software',
  AUTOMATIONS: 'Automações',
  OTHERS: 'Outros',
} as const

const getServiceCategoryLabel = (service?: ClientService | null) => {
  if (!service?.category) return 'Serviço personalizado'
  return serviceCategoryLabels[service.category as keyof typeof serviceCategoryLabels] ?? service.category
}

const formatCurrencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

const billingSchema = z.object({
  clientServiceId: z.string().min(1, 'Selecione o serviço'),
  status: z.string().min(1, 'Informe o status'),
  cycle: z.string().min(1, 'Informe o ciclo'),
  monthlyAmount: z
    .string()
    .min(1, 'Informe o valor')
    .transform((value) => {
      const normalized = value.replace(/\./g, '').replace(',', '.')
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : Number.NaN
    })
    .refine((value) => !Number.isNaN(value) && value >= 0, {
      message: 'Informe um valor válido',
    }),
  startDate: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  endDate: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  adjustmentIndex: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  notes: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
})

export type ServiceBillingFormValues = z.infer<typeof billingSchema>

const normalizeBillingToForm = (billing?: ServiceBilling | null): ServiceBillingFormValues => {
  if (!billing) {
    return {
      clientServiceId: '',
      status: 'active',
      cycle: 'monthly',
      monthlyAmount: 0,
      startDate: undefined,
      endDate: undefined,
      adjustmentIndex: undefined,
      notes: undefined,
    }
  }

  return {
    clientServiceId: billing.clientServiceId,
    status: billing.status ?? 'active',
    cycle: billing.cycle,
    monthlyAmount: billing.monthlyAmount ?? billing.service?.monthlyFee ?? 0,
    startDate: billing.startDate ?? undefined,
    endDate: billing.endDate ?? undefined,
    adjustmentIndex: billing.adjustmentIndex ?? undefined,
    notes: billing.notes ?? undefined,
  }
}

interface ServiceBillingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  billing?: ServiceBilling | null
  onSubmit: (values: ServiceBillingFormValues) => Promise<void> | void
  isSubmitting?: boolean
  clientId?: string
}

export function ServiceBillingFormDialog({
  open,
  onOpenChange,
  billing,
  onSubmit,
  isSubmitting,
  clientId,
}: ServiceBillingFormDialogProps) {
  const form = useForm<ServiceBillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: normalizeBillingToForm(billing),
  })

  useEffect(() => {
    if (open) {
      form.reset(normalizeBillingToForm(billing))
    }
  }, [billing, form, open])

  const servicesQuery = useClientServices({ clientId, pageSize: 100 })
  const services = servicesQuery.data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{billing ? 'Editar cobrança' : 'Nova cobrança recorrente'}</DialogTitle>
          <DialogDescription>
            Configure a recorrência vinculada a um serviço contratado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values)
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="clientServiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço do cliente</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        const selectedService = services.find((service) => service.id === value)
                        if (selectedService?.monthlyFee != null) {
                          form.setValue('monthlyAmount', selectedService.monthlyFee, { shouldDirty: true })
                        }
                        if (!form.getValues('cycle') && selectedService?.billingCycle) {
                          form.setValue('cycle', selectedService.billingCycle, { shouldDirty: true })
                        }
                      }}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicesQuery.isLoading ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm">
                            <Spinner className="size-4" /> Carregando serviços...
                          </div>
                        ) : (
                          services.map((service: ClientService) => {
                            const categoryLabel = getServiceCategoryLabel(service)
                            const clientLabel = service.client?.name ? ` • ${service.client.name}` : ''
                            const monthlyLabel = formatCurrencyBRL(service.monthlyFee)
                            const priceSegment = monthlyLabel ? ` • ${monthlyLabel}` : ''
                            return (
                              <SelectItem key={service.id} value={service.id}>
                                {categoryLabel}
                                {clientLabel}
                                {priceSegment}
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
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
                name="cycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cycleOptions.map((option) => (
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

            <FormField
              control={form.control}
              name="monthlyAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor mensal</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      placeholder="Ex: 1500,00"
                      value={field.value != null ? String(field.value) : ''}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encerramento</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="adjustmentIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Índice de reajuste</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: IPCA" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Detalhes da cobrança" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 size-4" /> Salvando...
                  </>
                ) : billing ? (
                  'Atualizar cobrança'
                ) : (
                  'Criar cobrança'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
