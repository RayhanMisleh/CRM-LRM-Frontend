'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { InvoicesTable } from '@/features/invoices/components/invoices-table'
import { InvoiceFormDialog, type InvoiceFormValues } from '@/features/invoices/components/invoice-form-dialog'
import {
  useCreateInvoice,
  useInvoices,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
  type ApiHttpError,
  type Invoice,
} from '@/features/invoices/api'
import { INVOICE_DUE_OPTIONS, INVOICE_PERIOD_OPTIONS, INVOICE_STATUS_OPTIONS } from '@/features/invoices/constants'
import { useClients } from '@/features/clients/api'
import { useContracts } from '@/features/contracts/api'
import { toast } from '@/hooks/use-toast'

const DEFAULT_INVOICE_PAGE_SIZE = 10

const filtersSchema = z.object({
  status: z.string().optional().or(z.literal('')).catch(''),
  dueIn: z.string().optional().or(z.literal('')).catch(''),
  clientId: z.string().optional().or(z.literal('')).catch(''),
  period: z.string().optional().or(z.literal('')).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z
    .coerce
    .number()
    .int()
    .min(5)
    .max(100)
    .catch(DEFAULT_INVOICE_PAGE_SIZE),
})

export type FiltersFormValues = z.infer<typeof filtersSchema>

const buildFiltersFromSearchParams = (searchParams: ReturnType<typeof useSearchParams>) => {
  const paramsObject: Record<string, unknown> = {}
  const entries = ['status', 'dueIn', 'clientId', 'period', 'page', 'pageSize'] as const

  for (const key of entries) {
    const value = searchParams.get(key)
    if (value !== null) {
      paramsObject[key] = value
    }
  }

  return filtersSchema.parse(paramsObject)
}

const toApiFilters = (values: FiltersFormValues) => ({
  status: values.status || undefined,
  clientId: values.clientId || undefined,
  dueIn: values.dueIn || undefined,
  period: values.period || undefined,
})

export default function InvoicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()

  const form = useForm<FiltersFormValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: buildFiltersFromSearchParams(searchParams),
  })

  const values = useWatch({ control: form.control }) as FiltersFormValues

  useEffect(() => {
    const parsed = buildFiltersFromSearchParams(searchParams)
    const current: FiltersFormValues = {
      status: values.status ?? '',
      dueIn: values.dueIn ?? '',
      clientId: values.clientId ?? '',
      period: values.period ?? '',
      page: values.page ?? 1,
      pageSize: values.pageSize ?? DEFAULT_INVOICE_PAGE_SIZE,
    }

    if (JSON.stringify(parsed) !== JSON.stringify(current)) {
      form.reset(parsed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, searchParamsString])

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)

    if (values.status) {
      params.set('status', values.status)
    } else {
      params.delete('status')
    }

    if (values.clientId) {
      params.set('clientId', values.clientId)
    } else {
      params.delete('clientId')
    }

    if (values.dueIn) {
      params.set('dueIn', values.dueIn)
    } else {
      params.delete('dueIn')
    }

    if (values.period) {
      params.set('period', values.period)
    } else {
      params.delete('period')
    }

    if (values.page && values.page !== 1) {
      params.set('page', String(values.page))
    } else {
      params.delete('page')
    }

    if (values.pageSize && values.pageSize !== DEFAULT_INVOICE_PAGE_SIZE) {
      params.set('pageSize', String(values.pageSize))
    } else {
      params.delete('pageSize')
    }

    const next = params.toString()
    if (next !== searchParamsString) {
      const nextUrl = next ? `${pathname}?${next}` : pathname
      router.replace(nextUrl, { scroll: false })
    }
  }, [pathname, router, searchParamsString, values])

  const clientsQuery = useClients({ pageSize: 100 })
  const contractsQuery = useContracts({ pageSize: 100 })

  const clientOptions = useMemo(
    () =>
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        name: client.tradeName ?? client.companyName ?? client.id,
      })) ?? [],
    [clientsQuery.data?.data],
  )

  const contractOptions = useMemo(
    () =>
      contractsQuery.data?.data?.map((contract) => ({
        id: contract.id,
        title: contract.title,
        clientId: contract.clientId,
      })) ?? [],
    [contractsQuery.data?.data],
  )

  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const updateInvoiceStatus = useUpdateInvoiceStatus()

  const [dialogState, setDialogState] = useState<{ open: boolean; invoice?: Invoice | null }>({ open: false })

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    if (params.get('create')) {
      setDialogState((previous) => (previous.invoice ? previous : { open: true }))
    }
  }, [searchParamsString])

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogState((previous) => (open ? previous : { open: false }))

      if (!open) {
        const params = new URLSearchParams(searchParamsString)
        params.delete('create')
        params.delete('invoiceId')
        const next = params.toString()
        const nextUrl = next ? `${pathname}?${next}` : pathname
        router.replace(nextUrl, { scroll: false })
      }
    },
    [pathname, router, searchParamsString],
  )

  const handleOpenCreate = useCallback(() => {
    setDialogState({ open: true })
    const params = new URLSearchParams(searchParamsString)
    params.set('create', 'manual')
    params.delete('invoiceId')
    const next = params.toString()
    const nextUrl = next ? `${pathname}?${next}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [pathname, router, searchParamsString])

  const handleOpenEdit = useCallback(
    (invoice: Invoice) => {
      setDialogState({ open: true, invoice })
      const params = new URLSearchParams(searchParamsString)
      params.delete('create')
      params.set('invoiceId', invoice.id)
      const next = params.toString()
      const nextUrl = next ? `${pathname}?${next}` : pathname
      router.replace(nextUrl, { scroll: false })
    },
    [pathname, router, searchParamsString],
  )

  const handleResetFilters = useCallback(() => {
    form.reset({
      status: '',
      dueIn: '',
      clientId: '',
      period: '',
      page: 1,
      pageSize: DEFAULT_INVOICE_PAGE_SIZE,
    })
  }, [form])

  const handleSubmitInvoice = useCallback(
    async (values: InvoiceFormValues) => {
      const payload = {
        clientId: values.clientId,
        contractId: values.contractId ?? null,
        number: values.number ?? null,
        description: values.description ?? null,
        amount: values.amount,
        currency: values.currency ?? 'BRL',
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        status: values.status,
      }

      try {
        if (dialogState.invoice) {
          await updateInvoice.mutateAsync({ id: dialogState.invoice.id, ...payload })
          toast({
            title: 'Fatura atualizada',
            description: 'As informações da fatura foram salvas com sucesso.',
          })
        } else {
          await createInvoice.mutateAsync(payload)
          toast({
            title: 'Fatura criada',
            description: 'A fatura manual foi emitida e já aparece na lista.',
          })
        }

        handleDialogChange(false)
      } catch (error) {
        const message =
          (error as ApiHttpError)?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar a fatura.'
        toast({
          title: 'Erro ao salvar fatura',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createInvoice, dialogState.invoice, handleDialogChange, updateInvoice],
  )

  const handleMarkAsPaid = useCallback(
    async (invoice: Invoice) => {
      try {
        await updateInvoiceStatus.mutateAsync({
          id: invoice.id,
          status: 'paid',
          paidAt: new Date().toISOString(),
        })

        toast({
          title: 'Fatura atualizada',
          description: 'Marcamos a fatura como paga e atualizamos o status.',
        })
      } catch (error) {
        const message =
          (error as ApiHttpError)?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível atualizar o status da fatura.'
        toast({
          title: 'Erro ao atualizar status',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [updateInvoiceStatus],
  )

  const pagination = useMemo(
    () => ({
      page: values.page ?? 1,
      pageSize: values.pageSize ?? DEFAULT_INVOICE_PAGE_SIZE,
    }),
    [values.page, values.pageSize],
  )

  const apiFilters = useMemo(() => toApiFilters(values), [values])

  const queryFilters = useMemo(
    () => ({
      ...apiFilters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    [apiFilters, pagination.page, pagination.pageSize],
  )

  const invoicesQuery = useInvoices(queryFilters)

  const isLoadingLists = clientsQuery.isLoading || contractsQuery.isLoading
  const dialogIsSubmitting = createInvoice.isPending || updateInvoice.isPending
  const isProcessing = dialogIsSubmitting || updateInvoiceStatus.isPending

  const hasFilters = Boolean(apiFilters.status || apiFilters.dueIn || apiFilters.clientId || apiFilters.period)
  const hasInvoices = (invoicesQuery.data?.data?.length ?? 0) > 0
  const showPlaceholder = !hasInvoices && !hasFilters && !invoicesQuery.isLoading

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    const invoiceId = params.get('invoiceId')

    if (invoiceId && invoicesQuery.data?.data) {
      const invoice = invoicesQuery.data.data.find((item) => item.id === invoiceId)
      if (invoice) {
        setDialogState({ open: true, invoice })
      }
    }
  }, [invoicesQuery.data?.data, searchParamsString])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturas"
        description="Acompanhe emissões, recebimentos e previsões de faturamento para manter o fluxo de caixa saudável."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Faturas' }]}
        actions={
          <Button
            className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
            onClick={handleOpenCreate}
          >
            Nova fatura
          </Button>
        }
      />

      <Form {...form}>
        <form className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue('page', 1)
                      if (value !== 'paid') {
                        form.setValue('period', '')
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-2xl border-white/15 bg-white/10 text-white">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-white/15 bg-background/95 backdrop-blur">
                      <SelectItem value="">Todos os status</SelectItem>
                      {INVOICE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue('page', 1)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-2xl border-white/15 bg-white/10 text-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-white/15 bg-background/95 backdrop-blur">
                      {INVOICE_DUE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue('page', 1)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-2xl border-white/15 bg-white/10 text-white">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-white/15 bg-background/95 backdrop-blur">
                      <SelectItem value="">Todos os clientes</SelectItem>
                      {clientOptions.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {values.status === 'paid' ? (
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('page', 1)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-2xl border-white/15 bg-white/10 text-white">
                          <SelectValue placeholder="Todo o período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-white/15 bg-background/95 backdrop-blur">
                        {INVOICE_PERIOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl text-white/80 hover:bg-white/10"
              onClick={handleResetFilters}
              disabled={isLoadingLists}
            >
              Limpar filtros
            </Button>
          </div>
        </form>
      </Form>

      {showPlaceholder ? (
        <EmptyPlaceholder
          title="Sem faturas emitidas"
          description="Crie sua primeira fatura para acompanhar o status de pagamento diretamente pelo CRM."
        >
          <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
            Importar faturas
          </Button>
          <Button
            className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
            onClick={handleOpenCreate}
          >
            Emitir fatura
          </Button>
        </EmptyPlaceholder>
      ) : (
        <InvoicesTable
          filters={apiFilters}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={(page) => form.setValue('page', page)}
          onPageSizeChange={(pageSize) => {
            form.setValue('pageSize', pageSize)
            form.setValue('page', 1)
          }}
          onEdit={handleOpenEdit}
          onMarkAsPaid={handleMarkAsPaid}
          isProcessing={isProcessing}
        />
      )}

      <InvoiceFormDialog
        open={dialogState.open}
        onOpenChange={handleDialogChange}
        invoice={dialogState.invoice}
        clients={clientOptions}
        contracts={contractOptions}
        isSubmitting={dialogIsSubmitting}
        onSubmit={handleSubmitInvoice}
      />

      {isLoadingLists ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Carregando informações auxiliares...
        </div>
      ) : null}
    </div>
  )
}
