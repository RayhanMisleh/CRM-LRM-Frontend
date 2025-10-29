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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

import type { Domain } from '../api'

const domainSchema = z.object({
  host: z.string().min(1, 'Informe o domínio'),
  clientId: z.string().min(1, 'Selecione o cliente'),
  provider: z.string().optional(),
  status: z.string().min(1, 'Informe o status'),
  expiresAt: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  autoRenew: z.boolean().optional().default(false),
  reminderDays: z.array(z.number()).optional().default([]),
  notes: z.string().optional(),
})

export type DomainFormValues = z.infer<typeof domainSchema>

interface Option {
  value: string
  label: string
}

interface ReminderOption {
  value: number
  label: string
}

interface DomainFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  domain?: Domain | null
  clients: Option[]
  providers: Option[]
  statuses: Option[]
  reminders: ReminderOption[]
  isSubmitting?: boolean
  onSubmit: (values: DomainFormValues) => Promise<void> | void
}

const defaultValues: DomainFormValues = {
  host: '',
  clientId: '',
  provider: undefined,
  status: 'active',
  expiresAt: undefined,
  autoRenew: false,
  reminderDays: [],
  notes: undefined,
}

const OTHER_PROVIDER_OPTION_VALUE = '__DOMAIN_OTHER_PROVIDER__'

const normalizeDomainToForm = (domain?: Domain | null): DomainFormValues => {
  if (!domain) {
    return defaultValues
  }

  return {
    host: domain.host ?? '',
    clientId: domain.clientId ?? '',
    provider: domain.provider ?? undefined,
    status: domain.status ?? 'active',
    expiresAt: domain.expiresAt ? domain.expiresAt.slice(0, 10) : undefined,
    autoRenew: Boolean(domain.autoRenew),
    reminderDays: domain.reminderDays ?? [],
    notes: domain.notes ?? undefined,
  }
}

export function DomainFormDialog({
  open,
  onOpenChange,
  domain,
  clients,
  providers,
  statuses,
  reminders,
  isSubmitting,
  onSubmit,
}: DomainFormDialogProps) {
  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(normalizeDomainToForm(domain))
    }
  }, [domain, form, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{domain ? 'Editar domínio' : 'Novo domínio'}</DialogTitle>
          <DialogDescription>
            Cadastre ou atualize informações de renovação e responsáveis pelo domínio.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domínio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex: exemplo.com.br" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-background/60">
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.value} value={client.value}>
                              {client.label}
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
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provedor</FormLabel>
                    <FormControl>
                      <Select
                        value={
                          field.value && field.value !== ''
                            ? field.value
                            : OTHER_PROVIDER_OPTION_VALUE
                        }
                        onValueChange={(value) =>
                          field.onChange(
                            value === OTHER_PROVIDER_OPTION_VALUE || value === ''
                              ? undefined
                              : value,
                          )
                        }
                      >
                        <SelectTrigger className="bg-background/60">
                          <SelectValue placeholder="Selecione o provedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={OTHER_PROVIDER_OPTION_VALUE}>Outro</SelectItem>
                          {providers.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-background/60">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
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

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de expiração</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoRenew"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Renovação automática</FormLabel>
                    <FormDescription>Ative para indicar que o domínio é renovado automaticamente.</FormDescription>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reminderDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lembretes</FormLabel>
                  <FormDescription>Selecione com quantos dias de antecedência os alertas devem ser enviados.</FormDescription>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {reminders.map((option) => {
                      const checked = field.value?.includes(option.value) ?? false
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const next = new Set(field.value ?? [])
                              if (value === true) {
                                next.add(option.value)
                              } else {
                                next.delete(option.value)
                              }
                              field.onChange(Array.from(next).sort((a, b) => a - b))
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Responsável, passos de renovação, credenciais..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-32">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" /> Salvando...
                  </span>
                ) : (
                  <span>Salvar domínio</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
