'use client'

import { useCallback, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  BadgeAlert,
  BadgeCheck,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  LucideIcon,
  MoreVertical,
  Play,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import Link from 'next/link'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { PageHeader } from '@/features/layout/header/page-header'
import { ClientServiceDialog, type ClientServiceFormValues } from '@/features/client-services/components/client-service-dialog'
import {
  useClientServices,
  useCreateClientService,
  useDeleteClientService,
  useUpdateClientService,
  type ClientService,
  type ClientServiceCategory,
  type CreateClientServiceInput,
  type UpdateClientServiceInput,
} from '@/features/client-services/api'
import { useCreateServiceBilling } from '@/features/service-billings/api'
import { useClients } from '@/features/clients/api'
import { useContracts } from '@/features/contracts/api'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from '@/hooks/use-toast'

const filtersSchema = z.object({
  clientId: z.string().optional().or(z.literal('')).catch(''),
  status: z.string().optional().or(z.literal('')).catch(''),
  category: z.string().optional().or(z.literal('')).catch(''),
  contractId: z.string().optional().or(z.literal('')).catch(''),
  startDate: z.string().optional().or(z.literal('')).catch(''),
  endDate: z.string().optional().or(z.literal('')).catch(''),
  search: z.string().optional().or(z.literal('')).catch(''),
})

type FiltersFormValues = z.infer<typeof filtersSchema>

const statusBadgeStyles: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-200',
  active: 'bg-emerald-500/20 text-emerald-200',
  paused: 'bg-amber-500/20 text-amber-200',
  suspended: 'bg-amber-500/20 text-amber-200',
  terminated: 'bg-rose-500/20 text-rose-200',
}

const supportLabels: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

const cycleLabels: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semester: 'Semestral',
  yearly: 'Anual',
}

const categoryLabels: Record<ClientServiceCategory, string> = {
  APPS: 'Apps',
  SITES: 'Sites',
  SOFTWARE: 'Software',
  AUTOMATIONS: 'Automações',
  OTHERS: 'Outros',
}

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  value: value as ClientServiceCategory,
  label,
}))

const getCategoryLabel = (category?: ClientServiceCategory | null) => {
  if (!category) return 'Serviço personalizado'
  return categoryLabels[category] ?? category
}

const ALL_VALUE = '__ALL__'

const formatCurrency = (value?: number | null, currency = 'BRL') => {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

const statusIcon: Record<string, LucideIcon> = {
  draft: BadgeAlert,
  active: BadgeCheck,
  paused: RefreshCw,
  suspended: RefreshCw,
  terminated: ShieldCheck,
}

export default function ClientServicesPage() {
  const confirm = useConfirm()
  const [dialogState, setDialogState] = useState<{ open: boolean; service?: ClientService | null }>({ open: false })

  const form = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: {
      clientId: '',
      status: '',
      category: '',
      contractId: '',
      startDate: '',
      endDate: '',
      search: '',
    },
  })

  const values = useWatch({ control: form.control })

  const servicesQuery = useClientServices({
    clientId: values?.clientId || undefined,
    status: values?.status ? (values.status === ALL_VALUE ? undefined : values.status) : undefined,
    category: values?.category || undefined,
    contractId: values?.contractId || undefined,
    startDate: values?.startDate || undefined,
    endDate: values?.endDate || undefined,
    search: values?.search || undefined,
  })

  const createService = useCreateClientService()
  const updateService = useUpdateClientService()
  const deleteService = useDeleteClientService()
  const createBilling = useCreateServiceBilling()

  const clientsQuery = useClients({ pageSize: 100 })
  const contractsQuery = useContracts({ clientId: values?.clientId || undefined })

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
        title: contract.title,
      })) ?? [],
    [contractsQuery.data?.data],
  )

  const statusOptions = useMemo(() => {
    const unique = new Set<string>()
    servicesQuery.data?.data?.forEach((service) => unique.add(service.status))
    return Array.from(unique)
  }, [servicesQuery.data?.data])

  const handleResetFilters = useCallback(() => {
    form.reset({
      clientId: '',
      status: '',
      category: '',
      contractId: '',
      startDate: '',
      endDate: '',
      search: '',
    })
  }, [form])

  const handleOpenCreate = useCallback(() => {
    setDialogState({ open: true, service: null })
  }, [])

  const handleOpenEdit = useCallback((service: ClientService) => {
    setDialogState({ open: true, service })
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogState({ open: false })
  }, [])

  const handleDeleteService = useCallback(
    async (service: ClientService) => {
      const confirmed = await confirm({
        title: 'Remover serviço',
        description: `Tem certeza que deseja remover o serviço de ${getCategoryLabel(service.category)}?`,
        confirmText: 'Remover serviço',
        confirmVariant: 'destructive',
      })
      if (!confirmed) return

      try {
        await deleteService.mutateAsync(service.id)
        toast({
          title: 'Serviço removido',
          description: 'O serviço foi removido do portfólio do cliente.',
        })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível remover o serviço.'
        toast({
          title: 'Erro ao remover',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [confirm, deleteService],
  )

  const handleSubmitDialog = useCallback(
    async (values: ClientServiceFormValues) => {
      const payload: CreateClientServiceInput = {
        clientId: values.clientId,
        category: values.category,
        contractId: values.contractId,
        status: values.status,
        billingCycle: values.billingCycle,
        supportLevel: values.supportLevel,
        monthlyFee: values.monthlyFee,
        developmentFee: values.developmentFee,
        hostingProvider: values.hostingProvider,
        repositoryUrls: values.repositoryUrls,
        environmentLinks:
          values.environmentLinks.length > 0
            ? values.environmentLinks.reduce<Record<string, string>>((acc, link) => {
                if (link.label && link.url) {
                  acc[link.label] = link.url
                }
                return acc
              }, {})
            : undefined,
        responsible: {
          name: values.responsible.name || undefined,
          email: values.responsible.email || undefined,
          phone: values.responsible.phone || undefined,
          role: values.responsible.role || undefined,
        },
        notes: values.notes,
        startDate: values.startDate,
        goLiveDate: values.goLiveDate,
        endDate: values.endDate,
      }

      const isEditing = Boolean(dialogState.service?.id)

      try {
        let serviceId = dialogState.service?.id ?? ''
        if (isEditing && dialogState.service) {
          await updateService.mutateAsync({ id: dialogState.service.id, ...payload } as UpdateClientServiceInput)
          serviceId = dialogState.service.id
          toast({
            title: 'Serviço atualizado',
            description: 'As informações do serviço foram atualizadas.',
          })
        } else {
          const created = await createService.mutateAsync(payload)
          serviceId = created.id
          toast({
            title: 'Serviço criado',
            description: 'O serviço foi registrado para o cliente.',
          })

          if (values.createBilling) {
            await createBilling.mutateAsync({
              clientServiceId: serviceId,
              status: values.billingStatus ?? 'active',
              cycle: values.billingCycleOverride || values.billingCycle || 'monthly',
              startDate: values.billingStartDate ?? values.startDate,
              endDate: values.billingEndDate,
              monthlyAmount: values.billingAmount ?? values.monthlyFee ?? 0,
              adjustmentIndex: values.billingAdjustmentIndex,
              notes: values.billingNotes,
            })
            toast({
              title: 'Cobrança configurada',
              description: 'A recorrência inicial foi preparada automaticamente.',
            })
          }
        }

        setDialogState({ open: false })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar o serviço.'
        toast({
          title: 'Erro ao salvar',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createBilling, createService, dialogState.service, updateService],
  )

  const services = servicesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços dos Clientes"
        description="Monitore os serviços ativos, status operacionais e clientes responsáveis por cada contrato."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Serviços dos Clientes' }]}
        actions={
          <Button onClick={handleOpenCreate}>
            <Play className="mr-2 size-4" />
            Novo serviço
          </Button>
        }
      />

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Refine o portfólio por cliente, status, categoria ou intervalo de datas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(value === ALL_VALUE ? '' : value)}
                        value={field.value ? field.value : ALL_VALUE}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os clientes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>Todos</SelectItem>
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
                        onValueChange={(value) => field.onChange(value === ALL_VALUE ? '' : value)}
                        value={field.value ? field.value : ALL_VALUE}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(value === ALL_VALUE ? '' : value)}
                        value={field.value ? field.value : ALL_VALUE}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>Todas</SelectItem>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(value === ALL_VALUE ? '' : value)}
                        value={field.value ? field.value : ALL_VALUE}
                        disabled={contractOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os contratos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                          {contractOptions.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.title}
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início a partir de</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início até</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Busca</FormLabel>
                    <FormControl>
                      <Input placeholder="Filtrar por responsável ou palavra-chave" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" onClick={handleResetFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-lg">Portfólio de serviços</CardTitle>
          <CardDescription>
            Visualize a carteira de serviços ativos, valores e indicadores operacionais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {servicesQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-3xl bg-white/10" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <EmptyPlaceholder
              title="Nenhum serviço encontrado"
              description="Cadastre um serviço ou ajuste os filtros para visualizar resultados."
            >
              <Button onClick={handleOpenCreate}>
                <Workflow className="mr-2 size-4" />
                Registrar serviço
              </Button>
            </EmptyPlaceholder>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {services.map((service) => {
                const statusStyle = statusBadgeStyles[service.status] ?? 'bg-white/10 text-white'
                const monthlyValue = formatCurrency(service.monthlyFee)
                const developmentValue = formatCurrency(service.developmentFee)
                const StatusIcon = statusIcon[service.status] ?? Workflow

                return (
                  <div
                    key={service.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusStyle} flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs`}>
                            <StatusIcon className="size-3" />
                            {service.status}
                          </Badge>
                          {service.supportLevel ? (
                            <Badge variant="outline" className="rounded-full border-white/20 text-white/80">
                              {supportLabels[service.supportLevel] ?? service.supportLevel}
                            </Badge>
                          ) : null}
                        </div>

                        <h3 className="text-lg font-semibold text-white">
                          {getCategoryLabel(service.category)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                          <span className="flex items-center gap-1">
                            <Building2 className="size-4" />
                            {service.client?.name ?? 'Cliente não informado'}
                          </span>
                          {service.billingCycle && (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="size-4" />
                              {cycleLabels[service.billingCycle] ?? service.billingCycle}
                            </span>
                          )}
                          {monthlyValue ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="size-4" />
                              {monthlyValue}
                            </span>
                          ) : null}
                          {developmentValue ? (
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="size-4" />
                              Desenvolvimento: {developmentValue}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/client-services/${service.id}`}>Abrir detalhes</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(service)}>
                            Editar informações
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/contracts?clientId=${service.clientId ?? ''}`}>Ver contratos</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/service-billings?clientServiceId=${service.id}`}>Gerenciar cobranças</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/expenses?clientServiceId=${service.id}`}>Registrar gasto</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteService(service)}
                            className="text-destructive focus:text-destructive"
                          >
                            Remover serviço
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-white/70">
                      {service.responsible?.name ? (
                        <p>
                          Responsável: <strong>{service.responsible.name}</strong>{' '}
                          {service.responsible.role ? `(${service.responsible.role})` : null}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-4 text-xs text-white/50">
                        {service.startDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Início: {format(new Date(service.startDate), 'dd/MM/yyyy')}
                          </span>
                        ) : null}
                        {service.goLiveDate ? (
                          <span className="flex items-center gap-1">
                            <Server className="size-3" />
                            Go-live: {format(new Date(service.goLiveDate), 'dd/MM/yyyy')}
                          </span>
                        ) : null}
                        {service.endDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Fim: {format(new Date(service.endDate), 'dd/MM/yyyy')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientServiceDialog
        open={dialogState.open}
        onOpenChange={handleCloseDialog}
        service={dialogState.service}
        isSubmitting={createService.isPending || updateService.isPending || createBilling.isPending}
        onSubmit={handleSubmitDialog}
      />
    </div>
  )
}
