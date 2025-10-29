'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MonitorCog, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { PageHeader } from '@/features/layout/header/page-header'
import { useClients, useUpdateClientTags } from '@/features/clients/api'
import {
  type Plan,
  useCreatePlan,
  useDeletePlan,
  usePlans,
  useUpdatePlan,
} from '@/features/plans/api'
import { updateThemePreference } from '@/app/(app)/settings/actions'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from '@/hooks/use-toast'

const billingCycleOptions = [
  { label: 'Sem ciclo definido', value: '' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Trimestral', value: 'quarterly' },
  { label: 'Semestral', value: 'semester' },
  { label: 'Anual', value: 'yearly' },
]

const BILLING_CYCLE_EMPTY_VALUE = '__BILLING_CYCLE_EMPTY__'

const planFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string({ required_error: 'Informe um nome para o plano.' })
    .trim()
    .min(2, 'Informe pelo menos 2 caracteres.'),
  description: z.string().optional(),
  amount: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .refine((value) => value === '' || !Number.isNaN(Number(value.replace(',', '.'))), {
      message: 'Informe um valor numérico maior ou igual a zero.',
    }),
  currency: z
    .string()
    .optional()
    .transform((value) => value?.trim().toUpperCase() ?? ''),
  billingCycle: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ''),
  features: z.array(z.string()).default([]),
  active: z.boolean().default(true),
})

type PlanFormValues = z.infer<typeof planFormSchema>

type ThemePreference = 'light' | 'dark' | 'system'

type TableDensity = 'comfortable' | 'compact'

const densityStorageKey = 'ui:table-density'

const formatCurrency = (value: number, currency = 'BRL') => {
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

export default function SettingsPage() {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [tableDensity, setTableDensity] = useState<TableDensity>('comfortable')
  const [themePreference, setThemePreference] = useState<ThemePreference>('system')
  const [isThemePending, startThemeTransition] = useTransition()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [localTags, setLocalTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')

  const confirm = useConfirm()
  const plansQuery = usePlans()
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()

  const clientsQuery = useClients({ pageSize: 100 })
  const clientOptions = useMemo(() => {
    return (
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        label: client.tradeName ?? client.companyName,
      })) ?? []
    )
  }, [clientsQuery.data?.data])

  const effectiveClientId = useMemo(() => {
    if (selectedClientId) return selectedClientId
    return clientOptions[0]?.id ?? null
  }, [clientOptions, selectedClientId])

  const selectedClient = useMemo(
    () =>
      clientsQuery.data?.data?.find((client) => client.id === (effectiveClientId ?? '')) ?? null,
    [clientsQuery.data?.data, effectiveClientId],
  )

  const updateClientTags = useUpdateClientTags()

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: '',
      description: '',
      amount: '',
      currency: 'BRL',
      billingCycle: '',
      features: [],
      active: true,
    },
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedDensity = window.localStorage.getItem(densityStorageKey)
    if (storedDensity === 'comfortable' || storedDensity === 'compact') {
      setTableDensity(storedDensity)
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const hasDarkClass = document.documentElement.classList.contains('dark')
    if (hasDarkClass) {
      setThemePreference('dark')
    } else if (prefersDark) {
      setThemePreference('system')
    } else {
      setThemePreference('light')
    }
  }, [])

  useEffect(() => {
    if (editingPlan) {
      planForm.reset({
        id: editingPlan.id,
        name: editingPlan.name,
        description: editingPlan.description ?? '',
        amount: editingPlan.amount != null ? String(editingPlan.amount) : '',
        currency: editingPlan.currency ?? 'BRL',
        billingCycle: editingPlan.billingCycle ?? '',
        features: editingPlan.features?.filter(Boolean) ?? [],
        active: editingPlan.active ?? true,
      })
    } else {
      planForm.reset({
        name: '',
        description: '',
        amount: '',
        currency: 'BRL',
        billingCycle: '',
        features: [],
        active: true,
      })
    }
  }, [editingPlan, planForm])

  useEffect(() => {
    if (!selectedClient) return
    setLocalTags(selectedClient.tags ?? [])
  }, [selectedClient])

  const handlePlanSubmit = useCallback(
    async (values: PlanFormValues) => {
      const amount = values.amount
        ? Number(values.amount.replace(',', '.'))
        : undefined
      const payload = {
        name: values.name,
        description: values.description?.trim() ? values.description.trim() : undefined,
        amount: amount,
        currency: values.currency ? values.currency : undefined,
        billingCycle: values.billingCycle ? values.billingCycle : undefined,
        features: values.features ?? [],
        active: values.active,
      }

      try {
        if (editingPlan) {
          await updatePlan.mutateAsync({ id: editingPlan.id, ...payload })
          toast({
            title: 'Plano atualizado',
            description: `${values.name} foi atualizado com sucesso.`,
          })
        } else {
          await createPlan.mutateAsync(payload)
          toast({
            title: 'Plano criado',
            description: `${values.name} foi adicionado ao catálogo.`,
          })
        }
        setEditingPlan(null)
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar o plano.'
        toast({
          title: 'Erro ao salvar plano',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createPlan, editingPlan, updatePlan],
  )

  const handleEditPlan = useCallback((plan: Plan) => {
    setEditingPlan(plan)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingPlan(null)
  }, [])

  const handleDeletePlan = useCallback(
    async (plan: Plan) => {
      const confirmed = await confirm({
        title: 'Remover plano',
        description: `Deseja realmente remover "${plan.name}"?`,
        confirmText: 'Remover plano',
        confirmVariant: 'destructive',
      })

      if (!confirmed) return

      try {
        await deletePlan.mutateAsync(plan.id)
        toast({
          title: 'Plano removido',
          description: `${plan.name} foi removido da lista.`,
        })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível remover o plano.'
        toast({
          title: 'Erro ao remover',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [confirm, deletePlan],
  )

  const handleDensityChange = useCallback((value: TableDensity) => {
    setTableDensity(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(densityStorageKey, value)
    }
  }, [])

  const applyThemePreference = useCallback((value: ThemePreference) => {
    if (typeof document === 'undefined') return

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const shouldUseDark =
      value === 'dark' || (value === 'system' && prefersDark)

    document.documentElement.classList.toggle('dark', shouldUseDark)
  }, [])

  const handleThemeChange = useCallback(
    (value: ThemePreference) => {
      setThemePreference(value)
      applyThemePreference(value)
      startThemeTransition(async () => {
        try {
          await updateThemePreference(value)
          toast({
            title: 'Preferência atualizada',
            description: 'O tema da interface foi atualizado.',
          })
        } catch (error) {
          const message =
            (error as { friendlyMessage?: string })?.friendlyMessage ??
            (error as Error)?.message ??
            'Não foi possível atualizar o tema agora.'
          toast({
            title: 'Erro ao atualizar tema',
            description: message,
            variant: 'destructive',
          })
        }
      })
    },
    [applyThemePreference],
  )

  const handleAddTag = useCallback(() => {
    const nextTag = tagDraft.trim()
    if (!nextTag) return

    setLocalTags((prev) => {
      if (prev.includes(nextTag)) return prev
      return [...prev, nextTag]
    })
    setTagDraft('')
  }, [tagDraft])

  const handleRemoveTag = useCallback((tag: string) => {
    setLocalTags((prev) => prev.filter((item) => item !== tag))
  }, [])

  const handlePersistTags = useCallback(async () => {
    if (!effectiveClientId) return

    try {
      await updateClientTags.mutateAsync({ id: effectiveClientId, tags: localTags })
      toast({
        title: 'Tags atualizadas',
        description: 'As tags do cliente foram atualizadas com sucesso.',
      })
    } catch (error) {
      const message =
        (error as { friendlyMessage?: string })?.friendlyMessage ??
        (error as Error)?.message ??
        'Não foi possível atualizar as tags.'
      toast({
        title: 'Erro ao atualizar tags',
        description: message,
        variant: 'destructive',
      })
    }
  }, [effectiveClientId, localTags, updateClientTags])

  const handleTagInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Personalize planos, tags e preferências visuais da sua operação."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Configurações' }]}
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">Planos</CardTitle>
            <CardDescription>
              Estruture planos de assinatura e mantenha valores e benefícios alinhados às ofertas vigentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Form {...planForm}>
              <form onSubmit={planForm.handleSubmit(handlePlanSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={planForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do plano</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Plano Enterprise" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={planForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor mensal</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="Ex: 299.90"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={planForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moeda</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="BRL"
                            maxLength={3}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={planForm.control}
                    name="billingCycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciclo de cobrança</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === BILLING_CYCLE_EMPTY_VALUE ? '' : value)
                            }
                            value={
                              field.value && field.value.trim() !== ''
                                ? field.value
                                : BILLING_CYCLE_EMPTY_VALUE
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um ciclo" />
                            </SelectTrigger>
                            <SelectContent>
                              {billingCycleOptions.map((option) => (
                                <SelectItem
                                  key={option.value || 'empty'}
                                  value={option.value === '' ? BILLING_CYCLE_EMPTY_VALUE : option.value}
                                >
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
                  control={planForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Destaque benefícios, limites e condições do plano."
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={planForm.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benefícios inclusos</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={'Escreva um benefício por linha\nEx: Onboarding dedicado'}
                          value={(field.value ?? []).join('\n')}
                          onChange={(event) => {
                            const value = event.target.value
                            const features = value
                              .split('\n')
                              .map((item) => item.trim())
                              .filter(Boolean)
                            field.onChange(features)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={planForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <FormLabel>Plano ativo</FormLabel>
                        <p className="text-muted-foreground text-sm">
                          Controle se o plano está disponível para novas vendas.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  {editingPlan && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="sm:min-w-36">
                      Cancelar edição
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="sm:min-w-36"
                    disabled={createPlan.isPending || updatePlan.isPending}
                  >
                    {(createPlan.isPending || updatePlan.isPending) && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {editingPlan ? 'Atualizar plano' : 'Salvar plano'}
                  </Button>
                </div>
              </form>
            </Form>

            <Separator className="border-white/10" />

            <div className="space-y-4">
              <h3 className="text-base font-semibold">Planos cadastrados</h3>
              {plansQuery.isLoading ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-white/80">
                  <Loader2 className="size-4 animate-spin" /> Carregando planos cadastrados...
                </div>
              ) : (plansQuery.data?.data?.length ?? 0) === 0 ? (
                <EmptyPlaceholder
                  title="Nenhum plano configurado"
                  description="Crie seu primeiro plano para começar a vender assinaturas alinhadas aos pacotes da empresa."
                >
                  <Button onClick={() => planForm.reset()} className="rounded-full">
                    <Plus className="mr-2 size-4" /> Criar plano
                  </Button>
                </EmptyPlaceholder>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {plansQuery.data?.data?.map((plan) => {
                    const createdAtDate = plan.createdAt ? new Date(plan.createdAt) : null
                    const formattedCreatedAt = createdAtDate?.toLocaleDateString('pt-BR')

                    return (
                    <div
                      key={plan.id}
                      className="group relative flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white/90">{plan.name}</p>
                          {plan.billingCycle && (
                            <p className="text-muted-foreground text-xs uppercase tracking-wide">
                              {billingCycleOptions.find((option) => option.value === plan.billingCycle)?.label ??
                                plan.billingCycle}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPlan(plan)}
                            aria-label={`Editar ${plan.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeletePlan(plan)}
                            aria-label={`Remover ${plan.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {plan.amount !== null && plan.amount !== undefined && (
                        <p className="text-lg font-semibold">
                          {formatCurrency(plan.amount, plan.currency ?? 'BRL')}
                        </p>
                      )}

                      {plan.description && <p className="text-sm text-white/80">{plan.description}</p>}

                      {plan.features && plan.features.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {plan.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="rounded-full bg-white/10 text-white">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={plan.active ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {plan.active ? 'Disponível' : 'Inativo'}
                        </span>
                        {formattedCreatedAt && (
                          <>
                            <span>&middot;</span>
                            <span>{formattedCreatedAt}</span>
                          </>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-lg">Preferências de UI</CardTitle>
              <CardDescription>
                Ajuste como a interface se comporta para o seu usuário, com densidade de dados e aparência do tema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Densidade de tabelas</p>
                <RadioGroup value={tableDensity} onValueChange={(value) => handleDensityChange(value as TableDensity)}>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <RadioGroupItem value="comfortable" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Confortável</p>
                      <p className="text-xs text-muted-foreground">
                        Mais espaçamento para leitura em relatórios detalhados.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <RadioGroupItem value="compact" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Compacto</p>
                      <p className="text-xs text-muted-foreground">
                        Aproveite melhor telas menores com células mais enxutas.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <Separator className="border-white/10" />

              <div className="space-y-3">
                <p className="text-sm font-medium">Tema da aplicação</p>
                <RadioGroup value={themePreference} onValueChange={(value) => handleThemeChange(value as ThemePreference)}>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <RadioGroupItem value="light" />
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sun className="size-4" /> Claro
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <RadioGroupItem value="dark" />
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Moon className="size-4" /> Escuro
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <RadioGroupItem value="system" />
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <MonitorCog className="size-4" />
                      Sistema
                    </div>
                  </label>
                </RadioGroup>
                {isThemePending && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Salvando preferência...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-lg">Tags de Cliente</CardTitle>
              <CardDescription>
                Organize segmentações rápidas para filtrar contatos e distribuir carteiras de atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {clientsQuery.isLoading ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-white/80">
                  <Loader2 className="size-4 animate-spin" /> Carregando clientes...
                </div>
              ) : clientOptions.length === 0 ? (
                <EmptyPlaceholder
                  title="Nenhum cliente disponível"
                  description="Cadastre clientes para começar a organizar tags personalizadas."
                >
                  <Button className="rounded-full" disabled>
                    Sem clientes
                  </Button>
                </EmptyPlaceholder>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80" htmlFor="client-selector">
                      Cliente para edição
                    </label>
                    <Select
                      value={effectiveClientId ?? ''}
                      onValueChange={(value) => setSelectedClientId(value)}
                    >
                      <SelectTrigger id="client-selector">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Nova tag"
                      className="w-48"
                    />
                    <Button type="button" variant="secondary" onClick={handleAddTag}>
                      <Plus className="mr-2 size-4" /> Adicionar tag
                    </Button>
                  </div>

                  <div className="min-h-[3rem] rounded-xl border border-white/10 bg-white/5 p-3">
                    {localTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada para este cliente.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {localTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-2 rounded-full bg-white/10 text-white"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              className="rounded-full bg-white/10 p-1 hover:bg-white/20"
                              onClick={() => handleRemoveTag(tag)}
                              aria-label={`Remover tag ${tag}`}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="min-w-40"
                      onClick={handlePersistTags}
                      disabled={updateClientTags.isPending || !effectiveClientId}
                    >
                      {updateClientTags.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Salvar tags
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
