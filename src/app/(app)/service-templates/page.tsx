'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Box, Layers, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { PageHeader } from '@/features/layout/header/page-header'
import {
  useCreateServiceTemplate,
  useDeleteServiceTemplate,
  useServiceTemplates,
  useUpdateServiceTemplate,
  type ServiceTemplate,
} from '@/features/service-templates/api'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from '@/hooks/use-toast'

const BILLING_CYCLE_EMPTY_VALUE = '__BILLING_CYCLE_EMPTY__'
const FILTER_EMPTY_VALUE = '__FILTER_EMPTY__'

const billingCycleOptions = [
  { label: 'Sem ciclo definido', value: '' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Bimestral', value: 'bimonthly' },
  { label: 'Trimestral', value: 'quarterly' },
  { label: 'Semestral', value: 'semester' },
  { label: 'Anual', value: 'yearly' },
]

const templateFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, 'Informe pelo menos 3 caracteres.'),
  category: z.string().optional(),
  description: z.string().optional(),
  baseMonthlyFee: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .refine((value) => value === '' || !Number.isNaN(Number(value.replace(',', '.'))), {
      message: 'Informe um valor numérico válido.',
    }),
  setupFee: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .refine((value) => value === '' || !Number.isNaN(Number(value.replace(',', '.'))), {
      message: 'Informe um valor numérico válido.',
    }),
  defaultBillingCycle: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ''),
  deliverables: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
})

type TemplateFormValues = z.infer<typeof templateFormSchema>

const filtersSchema = z.object({
  category: z.string().optional().catch(''),
  billingCycle: z.string().optional().catch(''),
  search: z.string().optional().catch(''),
})

type FiltersFormValues = z.infer<typeof filtersSchema>

const normalizeTemplateToForm = (template?: ServiceTemplate | null): TemplateFormValues => {
  if (!template) {
    return {
      name: '',
      category: '',
      description: '',
      baseMonthlyFee: '',
      setupFee: '',
      defaultBillingCycle: '',
      deliverables: [],
      stack: [],
      tags: [],
    }
  }

  return {
    id: template.id,
    name: template.name ?? '',
    category: template.category ?? '',
    description: template.description ?? '',
    baseMonthlyFee: template.baseMonthlyFee != null ? String(template.baseMonthlyFee) : '',
    setupFee: template.setupFee != null ? String(template.setupFee) : '',
    defaultBillingCycle: template.defaultBillingCycle ?? '',
    deliverables: template.deliverables?.filter(Boolean) ?? [],
    stack: template.stack?.filter(Boolean) ?? [],
    tags: template.tags?.filter(Boolean) ?? [],
  }
}

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

export default function ServiceTemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null)
  const confirm = useConfirm()

  const filtersForm = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: { category: '', billingCycle: '', search: '' },
  })

  const filterValues = useWatch({ control: filtersForm.control })
  const serviceTemplatesQuery = useServiceTemplates({
    category: filterValues?.category || undefined,
    billingCycle: filterValues?.billingCycle || undefined,
    search: filterValues?.search || undefined,
  })

  const createServiceTemplate = useCreateServiceTemplate()
  const updateServiceTemplate = useUpdateServiceTemplate()
  const deleteServiceTemplate = useDeleteServiceTemplate()

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: normalizeTemplateToForm(),
  })

  useEffect(() => {
    templateForm.reset(normalizeTemplateToForm(editingTemplate))
  }, [editingTemplate, templateForm])

  const categories = useMemo(() => {
    const list = serviceTemplatesQuery.data?.data ?? []
    const unique = new Set<string>()
    list.forEach((item) => {
      if (item.category) {
        unique.add(item.category)
      }
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [serviceTemplatesQuery.data?.data])

  const handleSubmitTemplate = useCallback(
    async (values: TemplateFormValues) => {
      const payload = {
        name: values.name.trim(),
        category: values.category?.trim() || undefined,
        description: values.description?.trim() || undefined,
        baseMonthlyFee:
          values.baseMonthlyFee && values.baseMonthlyFee !== ''
            ? Number(values.baseMonthlyFee.replace(',', '.'))
            : undefined,
        setupFee:
          values.setupFee && values.setupFee !== ''
            ? Number(values.setupFee.replace(',', '.'))
            : undefined,
        defaultBillingCycle: values.defaultBillingCycle?.trim() || undefined,
        deliverables: values.deliverables.filter(Boolean),
        stack: values.stack.filter(Boolean),
        tags: values.tags.filter(Boolean),
      }

      try {
        if (editingTemplate) {
          await updateServiceTemplate.mutateAsync({ id: editingTemplate.id, ...payload })
          toast({
            title: 'Template atualizado',
            description: `${values.name} foi atualizado com sucesso.`,
          })
        } else {
          await createServiceTemplate.mutateAsync(payload)
          toast({
            title: 'Template criado',
            description: `${values.name} foi adicionado ao catálogo.`,
          })
        }
        setEditingTemplate(null)
        templateForm.reset(normalizeTemplateToForm())
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar o template.'
        toast({
          title: 'Erro ao salvar template',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createServiceTemplate, editingTemplate, templateForm, updateServiceTemplate],
  )

  const handleEditTemplate = useCallback((template: ServiceTemplate) => {
    setEditingTemplate(template)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingTemplate(null)
    templateForm.reset(normalizeTemplateToForm())
  }, [templateForm])

  const handleDeleteTemplate = useCallback(
    async (template: ServiceTemplate) => {
      const confirmed = await confirm({
        title: 'Remover template',
        description: `Tem certeza que deseja remover "${template.name}" do catálogo?`,
        confirmText: 'Remover',
        confirmVariant: 'destructive',
      })
      if (!confirmed) return

      try {
        await deleteServiceTemplate.mutateAsync(template.id)
        toast({
          title: 'Template removido',
          description: `${template.name} foi removido do catálogo.`,
        })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível remover o template.'
        toast({
          title: 'Erro ao remover',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [confirm, deleteServiceTemplate],
  )

  const filteredTemplates = serviceTemplatesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Serviços"
        description="Gerencie templates reutilizáveis com escopo, entregáveis e stack para acelerar novas propostas."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Catálogo de Serviços' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingTemplate ? 'Editar template de serviço' : 'Novo template de serviço'}
            </CardTitle>
            <CardDescription>
              Defina categoria, entregáveis, stack e valores base para reutilizar em propostas de clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do serviço</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Site institucional premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={templateForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Desenvolvimento web" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={templateForm.control}
                    name="baseMonthlyFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensalidade sugerida</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="Ex: 2490,00"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={templateForm.control}
                    name="setupFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa de setup</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="Ex: 1500,00"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={templateForm.control}
                    name="defaultBillingCycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciclo padrão</FormLabel>
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
                  control={templateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resumo do escopo</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Descreva objetivos e resultados esperados deste serviço."
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="deliverables"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entregáveis</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={'Liste um entregável por linha\nEx: Wireframes responsivos'}
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

                <FormField
                  control={templateForm.control}
                  name="stack"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stack sugerida</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={'Escreva uma tecnologia por linha\nEx: Next.js\nEx: Vercel'}
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

                <FormField
                  control={templateForm.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: web, premium, inbound"
                          value={field.value?.join(', ') ?? ''}
                          onChange={(event) => {
                            const next = event.target.value
                              .split(',')
                              .map((item) => item.trim())
                              .filter(Boolean)
                            field.onChange(next)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-3">
                  {editingTemplate ? (
                    <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={createServiceTemplate.isPending || updateServiceTemplate.isPending}
                  >
                    {createServiceTemplate.isPending || updateServiceTemplate.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Salvando...
                      </>
                    ) : editingTemplate ? (
                      'Atualizar template'
                    ) : (
                      'Salvar template'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-lg">Filtros rápidos</CardTitle>
              <CardDescription>Refine o catálogo por categoria, ciclo padrão ou palavra-chave.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...filtersForm}>
                <form className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={filtersForm.control}
                    name="search"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Busca textual</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
                            <Search className="size-4 text-white/60" />
                            <Input
                              placeholder="Procure por nome, tag ou stack"
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(event.target.value)}
                              className="border-0 bg-transparent focus-visible:ring-0"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={filtersForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === FILTER_EMPTY_VALUE ? '' : value)
                            }
                            value={
                              field.value && field.value.trim() !== '' ? field.value : FILTER_EMPTY_VALUE
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FILTER_EMPTY_VALUE}>Todas</SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
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
                    control={filtersForm.control}
                    name="billingCycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciclo padrão</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === FILTER_EMPTY_VALUE ? '' : value)
                            }
                            value={
                              field.value && field.value.trim() !== '' ? field.value : FILTER_EMPTY_VALUE
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FILTER_EMPTY_VALUE}>Todos</SelectItem>
                              {billingCycleOptions
                                .filter((option) => option.value !== '')
                                .map((option) => (
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
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-lg">Templates cadastrados</CardTitle>
              <CardDescription>
                Visualize os serviços padronizados disponíveis para composição das ofertas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceTemplatesQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-xl bg-white/5" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <EmptyPlaceholder
                  title="Nenhum template localizado"
                  description="Cadastre um serviço ou ajuste os filtros para visualizar o catálogo."
                >
                  <Button type="button" onClick={() => setEditingTemplate(null)}>
                    <Plus className="mr-2 size-4" /> Novo template
                  </Button>
                </EmptyPlaceholder>
              ) : (
                <div className="space-y-4">
                  {filteredTemplates.map((template) => {
                    const formattedMonthly = formatCurrency(template.baseMonthlyFee)
                    const formattedSetup = formatCurrency(template.setupFee)
                    const formattedCreatedAt = template.createdAt
                      ? format(new Date(template.createdAt), "dd/MM/yyyy 'às' HH'h'")
                      : undefined

                    return (
                      <div
                        key={template.id}
                        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-2">
                              {template.category ? (
                                <Layers className="size-5" />
                              ) : (
                                <Box className="size-5" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-white">{template.name}</h3>
                              <p className="text-xs text-white/60">
                                {template.category ? `Categoria: ${template.category}` : 'Sem categoria definida'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white/70 hover:text-white"
                              onClick={() => handleEditTemplate(template)}
                              aria-label={`Editar ${template.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTemplate(template)}
                              aria-label={`Remover ${template.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {template.description ? (
                          <p className="mt-3 text-sm text-white/80">{template.description}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                          {template.defaultBillingCycle && (
                            <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                              Ciclo: {template.defaultBillingCycle}
                            </Badge>
                          )}
                          {formattedMonthly && (
                            <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                              Mensalidade: {formattedMonthly}
                            </Badge>
                          )}
                          {formattedSetup && (
                            <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                              Setup: {formattedSetup}
                            </Badge>
                          )}
                          {template.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="border-white/20 text-white/80">
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        {template.deliverables && template.deliverables.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-white/50">Entregáveis</p>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
                              {template.deliverables.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {template.stack && template.stack.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs uppercase tracking-wide text-white/50">Stack sugerida</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {template.stack.map((item) => (
                                <Badge key={item} variant="secondary" className="rounded-full bg-white/10 text-white">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {formattedCreatedAt && (
                          <p className="mt-4 text-xs text-white/40">Atualizado em {formattedCreatedAt}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
