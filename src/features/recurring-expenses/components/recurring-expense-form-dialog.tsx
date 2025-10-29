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

import type {
  RecurringExpense,
  RecurringExpenseFrequency,
  RecurringExpenseStatus,
} from '../api'

const recurringSchema = z.object({
  title: z.string().min(1, 'Informe um título'),
  description: z.string().optional(),
  type: z.string().min(1, 'Selecione o tipo'),
  status: z.string().min(1, 'Selecione o status'),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Informe um valor' })
    .min(0, 'Informe um valor válido'),
  currency: z.string().min(1, 'Selecione a moeda'),
  frequency: z.string().min(1, 'Selecione a recorrência'),
  firstDueDate: z.string().optional(),
  costCenter: z.string().optional(),
  notes: z.string().optional(),
})

export type RecurringExpenseFormValues = z.infer<typeof recurringSchema>

const defaultValues: RecurringExpenseFormValues = {
  title: '',
  description: '',
  type: 'service',
  status: 'active',
  amount: 0,
  currency: 'BRL',
  frequency: 'monthly',
  firstDueDate: '',
  costCenter: '',
  notes: '',
}

const normalizeRecurringExpense = (expense?: RecurringExpense | null): RecurringExpenseFormValues => {
  if (!expense) return defaultValues

  return {
    title: expense.title ?? '',
    description: expense.description ?? '',
    type: expense.type ?? 'service',
    status: expense.status ?? 'active',
    amount: expense.amount ?? 0,
    currency: expense.currency ?? 'BRL',
    frequency: expense.frequency ?? 'monthly',
    firstDueDate: expense.nextDueDate?.slice(0, 10) ?? '',
    costCenter: expense.costCenter ?? '',
    notes: expense.notes ?? '',
  }
}

interface RecurringExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RecurringExpenseFormValues) => Promise<void> | void
  expense?: RecurringExpense | null
  isSubmitting?: boolean
}

const TYPE_OPTIONS = [
  { label: 'Serviço', value: 'service' },
  { label: 'Produto', value: 'product' },
  { label: 'Folha de pagamento', value: 'payroll' },
  { label: 'Impostos e taxas', value: 'tax' },
  { label: 'Outros', value: 'fee' },
]

const STATUS_OPTIONS: { label: string; value: RecurringExpenseStatus }[] = [
  { label: 'Ativa', value: 'active' },
  { label: 'Pausada', value: 'paused' },
  { label: 'Cancelada', value: 'cancelled' },
]

const FREQUENCY_OPTIONS: { label: string; value: RecurringExpenseFrequency }[] = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Trimestral', value: 'quarterly' },
  { label: 'Anual', value: 'yearly' },
]

export function RecurringExpenseFormDialog({
  open,
  onOpenChange,
  onSubmit,
  expense,
  isSubmitting,
}: RecurringExpenseFormDialogProps) {
  const form = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(normalizeRecurringExpense(expense))
    }
  }, [expense, form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar despesa recorrente' : 'Nova despesa recorrente'}</DialogTitle>
          <DialogDescription>
            Configure a periodicidade para automatizar a geração de lançamentos futuros.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              onSubmit(values)
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Assinatura de software" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
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
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BRL">Real (BRL)</SelectItem>
                        <SelectItem value="USD">Dólar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recorrência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((option) => (
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
              <FormField
                control={form.control}
                name="firstDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próximo vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costCenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de custo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Operações" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Detalhes adicionais" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 size-4" /> Salvando
                  </>
                ) : expense ? (
                  'Atualizar recorrência'
                ) : (
                  'Criar recorrência'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
