'use client'

import { useCallback, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/features/layout/header/page-header'
import { useClients } from '@/features/clients/api'
import { useContracts } from '@/features/contracts/api'
import {
  useCreateSubscription,
  useUpdateSubscription,
  type Subscription,
} from '@/features/subscriptions/api'
import { SubscriptionFormDialog, type SubscriptionFormValues } from '@/features/subscriptions/components/subscription-form-dialog'
import { SubscriptionsTable } from '@/features/subscriptions/components/subscriptions-table'
import {
  DEFAULT_SUBSCRIPTION_PAGE_SIZE,
  SUBSCRIPTION_CYCLE_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
} from '@/features/subscriptions/constants'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from '@/hooks/use-toast'

const filtersSchema = z.object({
  clientId: z.string().optional().or(z.literal('')).catch(''),
  status: z.string().optional().or(z.literal('')).catch(''),
  cycle: z.string().optional().or(z.literal('')).catch(''),
  nextCharge: z.string().optional().or(z.literal('')).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(DEFAULT_SUBSCRIPTION_PAGE_SIZE),
})

type FiltersFormValues = z.infer<typeof filtersSchema>

const ALL_CLIENTS_OPTION_VALUE = '__ALL_SUBSCRIPTION_CLIENTS__'
const ALL_STATUS_OPTION_VALUE = '__ALL_SUBSCRIPTION_STATUS__'
const ALL_CYCLE_OPTION_VALUE = '__ALL_SUBSCRIPTION_CYCLE__'

const statusFilterOptions = [
  { label: 'Todos os status', value: ALL_STATUS_OPTION_VALUE },
  ...SUBSCRIPTION_STATUS_OPTIONS,
]
const cycleFilterOptions = [
  { label: 'Todos os ciclos', value: ALL_CYCLE_OPTION_VALUE },
  ...SUBSCRIPTION_CYCLE_OPTIONS,
]

export default function SubscriptionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)

  const form = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: {
      clientId: '',
      status: '',
      cycle: '',
      nextCharge: '',
      page: 1,
      pageSize: DEFAULT_SUBSCRIPTION_PAGE_SIZE,
    },
  })

  const values = useWatch({ control: form.control }) as FiltersFormValues
  const filters = useMemo(
    () => ({
      clientId: values.clientId || undefined,
      status: values.status || undefined,
      cycle: values.cycle || undefined,
      nextCharge: values.nextCharge || undefined,
    }),
    [values.clientId, values.cycle, values.nextCharge, values.status],
  )

  const clientsQuery = useClients({ pageSize: 100 })
  const contractsQuery = useContracts({ pageSize: 100 })

  const clientOptions = useMemo(
    () =>
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        name: client.tradeName ?? client.companyName,
      })) ?? [],
    [clientsQuery.data?.data],
  )

  const contractOptions = useMemo(
    () =>
      contractsQuery.data?.data?.map((contract) => ({
        id: contract.id,
        clientId: contract.clientId,
        title: contract.title,
      })) ?? [],
    [contractsQuery.data?.data],
  )

  const createSubscription = useCreateSubscription()
  const updateSubscription = useUpdateSubscription()
  const confirm = useConfirm()

  const handleOpenCreate = useCallback(() => {
    setEditingSubscription(null)
    setIsDialogOpen(true)
  }, [])

  const handleEditSubscription = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription)
    setIsDialogOpen(true)
  }, [])

  const handleDialogChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingSubscription(null)
    }
  }, [])

  const handlePageChange = useCallback(
    (page: number) => {
      form.setValue('page', Math.max(1, page))
    },
    [form],
  )

  const handlePageSizeChange = useCallback(
    (size: number) => {
      form.setValue('pageSize', Math.max(5, size))
      form.setValue('page', 1)
    },
    [form],
  )

  const handleClearFilters = useCallback(() => {
    form.reset({
      clientId: '',
      status: '',
      cycle: '',
      nextCharge: '',
      page: 1,
      pageSize: DEFAULT_SUBSCRIPTION_PAGE_SIZE,
    })
  }, [form])

  const handleCancelSubscription = useCallback(
    async (subscription: Subscription) => {
      const confirmed = await confirm({
        title: 'Cancelar assinatura',
        description: `Tem certeza que deseja cancelar "${subscription.planName}"?`,
        confirmText: 'Cancelar assinatura',
        cancelText: 'Manter ativa',
        confirmVariant: 'destructive',
      })
      if (!confirmed) return

      try {
        await updateSubscription.mutateAsync({
          id: subscription.id,
          clientId: subscription.clientId,
          status: 'canceled',
        })
        toast({
          title: 'Assinatura cancelada',
          description: `${subscription.planName} foi cancelada com sucesso.`,
        })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível cancelar a assinatura.'
        toast({
          title: 'Erro ao cancelar',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [confirm, updateSubscription],
  )

  const handleSubmitSubscription = useCallback(
    async (values: SubscriptionFormValues) => {
      const payload = {
        planName: values.planName,
        clientId: values.clientId,
        contractId: values.contractId ?? undefined,
        status: values.status,
        amount: values.amount ?? undefined,
        billingCycle: values.billingCycle ?? undefined,
        startedAt: values.startedAt ?? undefined,
        renewsAt: values.renewsAt ?? undefined,
      }

      try {
        if (editingSubscription) {
          await updateSubscription.mutateAsync({
            ...payload,
            id: editingSubscription.id,
            clientId: values.clientId,
          })
          toast({
            title: 'Assinatura atualizada',
            description: `${values.planName} foi atualizada com sucesso.`,
          })
        } else {
          await createSubscription.mutateAsync(payload)
          toast({
            title: 'Assinatura criada',
            description: `${values.planName} foi criada com sucesso.`,
          })
        }
        setIsDialogOpen(false)
        setEditingSubscription(null)
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar a assinatura.'
        toast({
          title: 'Erro ao salvar',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createSubscription, editingSubscription, updateSubscription],
  )

  const currentPage = values.page ?? 1
  const currentPageSize = values.pageSize ?? DEFAULT_SUBSCRIPTION_PAGE_SIZE

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        description="Gerencie assinaturas recorrentes, métricas de churn e planos ativos em um só lugar."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Assinaturas' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
          >
            Nova assinatura
          </Button>
        }
      />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-5">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value : ALL_CLIENTS_OPTION_VALUE}
                      onValueChange={(value) => {
                        const nextValue = value === ALL_CLIENTS_OPTION_VALUE ? '' : value
                        field.onChange(nextValue)
                        form.setValue('page', 1)
                      }}
                      disabled={clientsQuery.isLoading}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_CLIENTS_OPTION_VALUE}>Todos os clientes</SelectItem>
                        {clientOptions.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
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
                      value={field.value ? field.value : ALL_STATUS_OPTION_VALUE}
                      onValueChange={(value) => {
                        const nextValue = value === ALL_STATUS_OPTION_VALUE ? '' : value
                        field.onChange(nextValue)
                        form.setValue('page', 1)
                      }}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusFilterOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
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
                    <Select
                      value={field.value ? field.value : ALL_CYCLE_OPTION_VALUE}
                      onValueChange={(value) => {
                        const nextValue = value === ALL_CYCLE_OPTION_VALUE ? '' : value
                        field.onChange(nextValue)
                        form.setValue('page', 1)
                      }}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycleFilterOptions.map((cycle) => (
                          <SelectItem key={cycle.value} value={cycle.value}>
                            {cycle.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextCharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima cobrança até</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ''}
                      onChange={(event) => {
                        field.onChange(event.target.value)
                        form.setValue('page', 1)
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-end justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <SubscriptionsTable
        filters={filters}
        page={currentPage}
        pageSize={currentPageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={handleEditSubscription}
        onCancel={handleCancelSubscription}
      />

      <SubscriptionFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogChange}
        subscription={editingSubscription}
        clients={clientOptions}
        contracts={contractOptions}
        contractsLoading={contractsQuery.isLoading}
        isSubmitting={createSubscription.isPending || updateSubscription.isPending}
        onSubmit={handleSubmitSubscription}
      />
    </div>
  )
}
