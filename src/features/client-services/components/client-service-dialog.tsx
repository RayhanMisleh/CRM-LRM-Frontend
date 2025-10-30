'use client'

import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCopy,
  LinkIcon,
  Loader2,
  Server,
  Shield,
  Tags,
  Workflow,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useClients } from '@/features/clients/api'
import { useContracts } from '@/features/contracts/api'
import { useServiceTemplates } from '@/features/service-templates/api'
import {
  type ClientService,
  type CreateClientServiceInput,
  type UpdateClientServiceInput,
} from '@/features/client-services/api'

const NO_CONTRACT_OPTION = '__NO_CONTRACT__'
const INHERIT_TEMPLATE_CYCLE_OPTION = '__INHERIT_TEMPLATE_CYCLE__'
const INHERIT_SERVICE_CYCLE_OPTION = '__INHERIT_SERVICE_CYCLE__'

const responsibleSchema = z.object({
  name: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.string().optional().or(z.literal('')),
})

const environmentLinkSchema = z.object({
  label: z.string().optional().or(z.literal('')),
  url: z.string().optional().or(z.literal('')),
})

const wizardSchema = z
  .object({
    clientId: z.string().min(1, 'Selecione o cliente'),
    templateId: z.string().min(1, 'Selecione um template'),
    contractId: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    status: z.string().min(1, 'Informe o status do serviço'),
    billingCycle: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
    supportLevel: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
    defaultMonthlyFee: z
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
    hostingProvider: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
    repositoryUrls: z.array(z.string()).default([]),
    environmentLinks: z.array(environmentLinkSchema).default([]),
    responsible: responsibleSchema,
    notes: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
    tags: z.array(z.string()).default([]),
    startDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    goLiveDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    endDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    createBilling: z.boolean().default(true),
    billingStatus: z.string().optional().or(z.literal('')).transform((value) => (value ? value : 'active')),
    billingCycleOverride: z.string().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
    billingStartDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    billingEndDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    billingAmount: z
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
    billingAdjustmentIndex: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    billingNotes: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((value) => (value ? value : undefined)),
    billingTags: z.array(z.string()).default([]),
  })
  .superRefine((values, ctx) => {
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'A data de término deve ser posterior ao início.',
      })
    }

    if (values.startDate && values.goLiveDate && values.startDate > values.goLiveDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['goLiveDate'],
        message: 'O go-live deve ocorrer após a data de início.',
      })
    }

    if (values.goLiveDate && values.endDate && values.goLiveDate > values.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'O go-live não pode ser posterior à data de término.',
      })
    }

    if (values.createBilling) {
      if (!values.billingCycleOverride && !values.billingCycle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingCycleOverride'],
          message: 'Defina um ciclo para a cobrança inicial.',
        })
      }
      if (!values.billingAmount || Number.isNaN(values.billingAmount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingAmount'],
          message: 'Informe o valor mensal da cobrança.',
        })
      }
      if (values.billingStartDate && values.billingEndDate && values.billingStartDate > values.billingEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingEndDate'],
          message: 'A cobrança deve encerrar após a data de início.',
        })
      }
    }
  })

export type ClientServiceFormValues = z.infer<typeof wizardSchema>

interface ClientServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: ClientService | null
  isSubmitting?: boolean
  onSubmit: (values: ClientServiceFormValues) => Promise<void> | void
  clientId?: string
}

const billingCycleOptions = [
  { label: 'Mensal', value: 'monthly' },
  { label: 'Bimestral', value: 'bimonthly' },
  { label: 'Trimestral', value: 'quarterly' },
  { label: 'Semestral', value: 'semester' },
  { label: 'Anual', value: 'yearly' },
]

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'terminated', label: 'Encerrado' },
]

const supportLevelOptions = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
]

const billingStatusOptions = [
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'ended', label: 'Encerrada' },
]

const defaultValues: ClientServiceFormValues = {
  clientId: '',
  templateId: '',
  contractId: undefined,
  status: 'active',
  billingCycle: undefined,
  supportLevel: 'standard',
  defaultMonthlyFee: undefined,
  hostingProvider: undefined,
  repositoryUrls: [],
  environmentLinks: [{ label: 'Produção', url: '' }],
  responsible: {},
  notes: undefined,
  tags: [],
  startDate: undefined,
  goLiveDate: undefined,
  endDate: undefined,
  createBilling: true,
  billingStatus: 'active',
  billingCycleOverride: undefined,
  billingStartDate: undefined,
  billingEndDate: undefined,
  billingAmount: undefined,
  billingAdjustmentIndex: undefined,
  billingNotes: undefined,
  billingTags: [],
}

const normalizeServiceToForm = (service?: ClientService | null, clientId?: string): ClientServiceFormValues => {
  if (!service) {
    if (clientId) {
      return { ...defaultValues, clientId }
    }
    return defaultValues
  }

  const environmentLinks =
    service.environmentLinks && Object.keys(service.environmentLinks).length > 0
      ? Object.entries(service.environmentLinks).map(([label, url]) => ({ label, url: url ?? '' }))
      : [{ label: 'Produção', url: '' }]

  return {
    clientId: service.clientId ?? clientId ?? '',
    templateId: service.templateId ?? '',
    contractId: service.contractId ?? undefined,
    status: service.status ?? 'active',
    billingCycle: service.billingCycle ?? undefined,
    supportLevel: service.supportLevel ?? 'standard',
    defaultMonthlyFee: service.defaultMonthlyFee ?? undefined,
    hostingProvider: service.hostingProvider ?? undefined,
    repositoryUrls: service.repositoryUrls ?? [],
    environmentLinks,
    responsible: service.responsible ?? {},
    notes: service.notes ?? undefined,
    tags: service.tags ?? [],
    startDate: service.startDate ?? undefined,
    goLiveDate: service.goLiveDate ?? undefined,
    endDate: service.endDate ?? undefined,
    createBilling: false,
    billingStatus: 'active',
    billingCycleOverride: service.billingCycle ?? undefined,
    billingStartDate: service.startDate ?? undefined,
    billingEndDate: service.endDate ?? undefined,
    billingAmount: service.defaultMonthlyFee ?? undefined,
    billingAdjustmentIndex: undefined,
    billingNotes: undefined,
    billingTags: [],
  }
}

export function ClientServiceDialog({
  open,
  onOpenChange,
  service,
  isSubmitting,
  onSubmit,
  clientId,
}: ClientServiceDialogProps) {
  const [currentStep, setCurrentStep] = useState<'context' | 'scope' | 'billing'>('context')

  const form = useForm<ClientServiceFormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: normalizeServiceToForm(service, clientId),
    mode: 'onChange',
  })

  const templateId = useWatch({ control: form.control, name: 'templateId' })
  const selectedClientId = useWatch({ control: form.control, name: 'clientId' })

  const clientsQuery = useClients({ pageSize: 100 })
  const templatesQuery = useServiceTemplates()
  const contractsQuery = useContracts({ clientId: selectedClientId || undefined })

  const environmentLinksArray = useFieldArray({ control: form.control, name: 'environmentLinks' })

  useEffect(() => {
    if (open) {
      form.reset(normalizeServiceToForm(service, clientId))
      setCurrentStep('context')
    }
  }, [clientId, form, open, service])

  const templateOptions = useMemo(
    () =>
      templatesQuery.data?.data?.map((template) => ({
        id: template.id,
        name: template.name,
        category: template.category,
        billingCycle: template.defaultBillingCycle,
      })) ?? [],
    [templatesQuery.data?.data],
  )

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

  const selectedTemplate = useMemo(
    () => templateOptions.find((template) => template.id === templateId) ?? null,
    [templateId, templateOptions],
  )

  const handleNextStep = async () => {
    if (currentStep === 'context') {
      const valid = await form.trigger(['clientId', 'templateId', 'contractId'])
      if (!valid) return
      setCurrentStep('scope')
      return
    }
    if (currentStep === 'scope') {
      const valid = await form.trigger([
        'status',
        'defaultMonthlyFee',
        'supportLevel',
        'startDate',
        'goLiveDate',
        'endDate',
      ])
      if (!valid) return
      setCurrentStep('billing')
    }
  }

  const handlePreviousStep = () => {
    if (currentStep === 'billing') {
      setCurrentStep('scope')
    } else if (currentStep === 'scope') {
      setCurrentStep('context')
    }
  }

  const handleEnvironmentLinkChange = (index: number, key: 'label' | 'url', value: string) => {
    const current = form.getValues('environmentLinks')
    const next = [...current]
    next[index] = { ...next[index], [key]: value }
    form.setValue('environmentLinks', next)
  }

  const handleAddEnvironmentLink = () => {
    environmentLinksArray.append({ label: '', url: '' })
  }

  const handleRemoveEnvironmentLink = (index: number) => {
    if (environmentLinksArray.fields.length <= 1) return
    environmentLinksArray.remove(index)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  const buildTemplateHints = () => {
    if (!selectedTemplate) return null

    return (
      <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-3 text-xs text-white/70">
        <p className="font-semibold text-white">Resumo do template selecionado</p>
        <ul className="mt-2 space-y-1">
          {selectedTemplate.category ? <li>Categoria: {selectedTemplate.category}</li> : null}
          {selectedTemplate.billingCycle ? <li>Ciclo padrão: {selectedTemplate.billingCycle}</li> : null}
        </ul>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{service ? 'Atualizar serviço do cliente' : 'Novo serviço para o cliente'}</DialogTitle>
          <DialogDescription>
            Estruture o serviço contratado, com contexto, equipe e parâmetros financeiros.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={currentStep} className="space-y-4">
              <TabsList>
                <TabsTrigger value="context">
                  <Workflow className="size-4" />
                  Contexto
                </TabsTrigger>
                <TabsTrigger value="scope">
                  <Shield className="size-4" />
                  Escopo & SLA
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <Tags className="size-4" />
                  Cobrança inicial
                </TabsTrigger>
              </TabsList>

              <TabsContent value="context">
                <div className="grid gap-4 md:grid-cols-2">
                  {!clientId ? (
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                              <SelectTrigger>
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
                  ) : null}

                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template de serviço</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templatesQuery.isLoading ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                                  <Spinner className="size-4" /> Carregando templates...
                                </div>
                              ) : (
                                templateOptions.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))
                              )}
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
                        <FormLabel>Contrato vinculado</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => field.onChange(value === NO_CONTRACT_OPTION ? '' : value)}
                            value={field.value ? field.value : NO_CONTRACT_OPTION}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_CONTRACT_OPTION}>Sem contrato</SelectItem>
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

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Status do serviço" />
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
                </div>

                <div className="mt-4">{buildTemplateHints()}</div>
              </TabsContent>

              <TabsContent value="scope">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="supportLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de suporte</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {supportLevelOptions.map((option) => (
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
                            onValueChange={(value) => field.onChange(value === INHERIT_TEMPLATE_CYCLE_OPTION ? '' : value)}
                            value={field.value ? field.value : INHERIT_TEMPLATE_CYCLE_OPTION}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Herda do template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={INHERIT_TEMPLATE_CYCLE_OPTION}>Usar ciclo padrão</SelectItem>
                              {billingCycleOptions.map((option) => (
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
                    name="defaultMonthlyFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensalidade base</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="Ex: 3500,00"
                            value={field.value != null ? String(field.value) : ''}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hostingProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Infraestrutura / Hosting</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Vercel, AWS, DigitalOcean" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                    name="goLiveDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Go-live</FormLabel>
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

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="responsible.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da pessoa responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsible.role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo / Função</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: PM, Tech Lead" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsible.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsible.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="repositoryUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repositórios</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={'Informe uma URL por linha.\nEx: https://github.com/empresa/projeto'}
                          value={(field.value ?? []).join('\n')}
                          onChange={(event) => {
                            const value = event.target.value
                            const items = value
                              .split('\n')
                              .map((item) => item.trim())
                              .filter(Boolean)
                            field.onChange(items)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Ambientes & Links</p>
                  <div className="space-y-3">
                    {environmentLinksArray.fields.map((field, index) => (
                      <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                        <Input
                          placeholder="Identificação"
                          value={form.watch(`environmentLinks.${index}.label`) ?? ''}
                          onChange={(event) => handleEnvironmentLinkChange(index, 'label', event.target.value)}
                        />
                        <Input
                          placeholder="URL do ambiente"
                          value={form.watch(`environmentLinks.${index}.url`) ?? ''}
                          onChange={(event) => handleEnvironmentLinkChange(index, 'url', event.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveEnvironmentLink(index)}
                          aria-label="Remover link"
                        >
                          <CircleDashed className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={handleAddEnvironmentLink}>
                    <LinkIcon className="mr-2 size-4" />
                    Adicionar ambiente
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: onboarding, ecommerce, retainer"
                          value={(field.value ?? []).join(', ')}
                          onChange={(event) => {
                            const value = event.target.value
                            const items = value
                              .split(',')
                              .map((item) => item.trim())
                              .filter(Boolean)
                            field.onChange(items)
                          }}
                        />
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
                      <FormLabel>Notas internas</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Observações gerais sobre o escopo e expectativas." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="billing">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="createBilling"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                        <div>
                          <FormLabel>Criar cobrança recorrente</FormLabel>
                          <p className="text-xs text-white/60">
                            Cria um registro em &quot;Cobranças&quot; ao finalizar este formulário.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={field.value ? 'secondary' : 'outline'}
                          onClick={() => field.onChange(!field.value)}
                        >
                          {field.value ? 'Ativado' : 'Desativado'}
                        </Button>
                      </FormItem>
                    )}
                  />

                  {form.watch('createBilling') ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="billingStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status inicial</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value ?? 'active'}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Status da cobrança" />
                                </SelectTrigger>
                                <SelectContent>
                                  {billingStatusOptions.map((option) => (
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
                        name="billingCycleOverride"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciclo da cobrança</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => field.onChange(value === INHERIT_SERVICE_CYCLE_OPTION ? '' : value)}
                                value={field.value ? field.value : INHERIT_SERVICE_CYCLE_OPTION}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Herda do serviço" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={INHERIT_SERVICE_CYCLE_OPTION}>Usar ciclo do serviço</SelectItem>
                                  {billingCycleOptions.map((option) => (
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
                        name="billingAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor mensal</FormLabel>
                            <FormControl>
                              <Input
                                inputMode="decimal"
                                placeholder="Ex: 3500,00"
                                value={field.value != null ? String(field.value) : ''}
                                onChange={(event) => field.onChange(event.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAdjustmentIndex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Índice de reajuste</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: IPCA, IGP-M" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início da cobrança</FormLabel>
                            <FormControl>
                              <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Término da cobrança</FormLabel>
                            <FormControl>
                              <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingTags"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Tags da cobrança</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: retainer, onboarding"
                                value={(field.value ?? []).join(', ')}
                                onChange={(event) => {
                                  const value = event.target.value
                                  const items = value
                                    .split(',')
                                    .map((item) => item.trim())
                                    .filter(Boolean)
                                  field.onChange(items)
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingNotes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Observações da cobrança</FormLabel>
                            <FormControl>
                              <Textarea rows={3} placeholder="Detalhes da cobrança inicial." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-4 text-sm text-white/70">
                      <p className="font-semibold text-white">Criação de cobrança desativada</p>
                      <p className="mt-2">
                        Você pode registrar cobranças a qualquer momento acessando o módulo <strong>Cobranças</strong> ou a
                        aba correspondente na visão detalhada do serviço.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-white/60">
                {service?.createdAt ? (
                  <>
                    <Calendar className="size-4" />
                    <span>
                      Criado em {format(new Date(service.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="size-4" />
                    <span>As informações serão enviadas para o CRM.</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStep !== 'context' ? (
                  <Button type="button" variant="ghost" onClick={handlePreviousStep}>
                    <ChevronLeft className="mr-1 size-4" />
                    Voltar
                  </Button>
                ) : null}
                {currentStep !== 'billing' ? (
                  <Button type="button" onClick={handleNextStep}>
                    Avançar
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                    {service ? 'Salvar alterações' : 'Criar serviço'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
