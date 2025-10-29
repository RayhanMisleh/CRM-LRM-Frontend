'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { useClients } from '@/features/clients/api'
import {
  useCreateDomain,
  useDeleteDomain,
  useUpdateDomain,
  type ApiHttpError,
  type Domain,
  type DomainListFilters,
} from '@/features/domains/api'
import { DomainsTable } from '@/features/domains/components/domains-table'
import { DomainFormDialog, type DomainFormValues } from '@/features/domains/components/domain-form-dialog'
import {
  DOMAIN_PROVIDER_OPTIONS,
  DOMAIN_REMINDER_OPTIONS,
  DOMAIN_STATUS_OPTIONS,
} from '@/features/domains/constants'
import { toast } from '@/hooks/use-toast'

const DEFAULT_DOMAIN_PAGE_SIZE = 10

const filtersSchema = z.object({
  status: z.string().optional().or(z.literal('')).catch(''),
  dueIn: z.string().optional().or(z.literal('')).catch(''),
  clientId: z.string().optional().or(z.literal('')).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(DEFAULT_DOMAIN_PAGE_SIZE),
})

export type FiltersFormValues = z.infer<typeof filtersSchema>

const buildFiltersFromSearchParams = (searchParams: ReturnType<typeof useSearchParams>) => {
  const paramsObject: Record<string, unknown> = {}
  const entries = ['status', 'dueIn', 'clientId', 'page', 'pageSize'] as const

  for (const key of entries) {
    const value = searchParams.get(key)
    if (value !== null) {
      paramsObject[key] = value
    }
  }

  return filtersSchema.parse(paramsObject)
}

const toApiFilters = (values: FiltersFormValues): DomainListFilters => ({
  status: values.status || undefined,
  clientId: values.clientId || undefined,
  dueIn: values.dueIn ? Number(values.dueIn) : undefined,
})

export default function DomainsPage() {
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
      page: values.page ?? 1,
      pageSize: values.pageSize ?? DEFAULT_DOMAIN_PAGE_SIZE,
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

    if (values.page && values.page !== 1) {
      params.set('page', String(values.page))
    } else {
      params.delete('page')
    }

    if (values.pageSize && values.pageSize !== DEFAULT_DOMAIN_PAGE_SIZE) {
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

  const [dialogState, setDialogState] = useState<{ open: boolean; domain?: Domain | null }>({ open: false })

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    if (params.get('create')) {
      setDialogState((previous) => (previous.open ? previous : { open: true }))
    }
  }, [searchParamsString])

  const clientsQuery = useClients({ pageSize: 100 })

  const clientOptions = useMemo(
    () =>
      clientsQuery.data?.data?.map((client) => ({
        value: client.id,
        label: client.tradeName ?? client.companyName ?? client.id,
      })) ?? [],
    [clientsQuery.data?.data],
  )

  const createDomain = useCreateDomain()
  const updateDomain = useUpdateDomain()
  const deleteDomain = useDeleteDomain()

  const isSubmitting = createDomain.isPending || updateDomain.isPending

  const filters = useMemo(() => toApiFilters(values), [values])
  const page = values.page ?? 1
  const pageSize = values.pageSize ?? DEFAULT_DOMAIN_PAGE_SIZE

  const handleFiltersChange = useCallback(
    (changes: Partial<DomainListFilters>) => {
      if (Object.prototype.hasOwnProperty.call(changes, 'status')) {
        form.setValue('status', changes.status ?? '')
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'dueIn')) {
        const dueInValue = changes.dueIn
        form.setValue('dueIn', dueInValue ? String(dueInValue) : '')
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'clientId')) {
        form.setValue('clientId', changes.clientId ?? '')
      }

      form.setValue('page', 1)
    },
    [form],
  )

  const handlePageChange = useCallback(
    (nextPage: number) => {
      form.setValue('page', Math.max(1, nextPage))
    },
    [form],
  )

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      form.setValue('pageSize', nextPageSize)
      form.setValue('page', 1)
    },
    [form],
  )

  const handleOpenCreate = useCallback(() => {
    const params = new URLSearchParams(searchParamsString)
    params.set('create', '1')
    params.delete('domainId')
    const next = params.toString()
    const nextUrl = next ? `${pathname}?${next}` : pathname
    router.replace(nextUrl, { scroll: false })
    setDialogState({ open: true })
  }, [pathname, router, searchParamsString])

  const handleOpenEdit = useCallback((domain: Domain) => {
    setDialogState({ open: true, domain })
  }, [])

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogState((previous) => (open ? previous : { open: false }))

      if (!open) {
        const params = new URLSearchParams(searchParamsString)
        params.delete('create')
        params.delete('domainId')
        const next = params.toString()
        const nextUrl = next ? `${pathname}?${next}` : pathname
        router.replace(nextUrl, { scroll: false })
      }
    },
    [pathname, router, searchParamsString],
  )

  const handleSubmitDomain = useCallback(
    async (values: DomainFormValues) => {
      const payload = {
        clientId: values.clientId,
        host: values.host,
        provider: values.provider || undefined,
        status: values.status,
        expiresAt: values.expiresAt || undefined,
        autoRenew: values.autoRenew ?? false,
        reminderDays: values.reminderDays ?? [],
        notes: values.notes || undefined,
      }

      try {
        if (dialogState.domain) {
          await updateDomain.mutateAsync({ id: dialogState.domain.id, ...payload })
          toast({
            title: 'Domínio atualizado',
            description: `${values.host} foi atualizado com sucesso.`,
          })
        } else {
          await createDomain.mutateAsync(payload)
          toast({
            title: 'Domínio criado',
            description: `${values.host} foi cadastrado com sucesso.`,
          })
        }

        handleDialogChange(false)
      } catch (error) {
        const message =
          (error as ApiHttpError)?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar o domínio.'

        toast({
          title: 'Erro ao salvar domínio',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [createDomain, dialogState.domain, handleDialogChange, updateDomain],
  )

  const handleDeleteDomain = useCallback(
    async (domain: Domain) => {
      const confirmed = window.confirm(`Deseja realmente excluir o domínio ${domain.host}?`)
      if (!confirmed) return

      try {
        await deleteDomain.mutateAsync(domain.id)
        toast({
          title: 'Domínio excluído',
          description: `${domain.host} foi removido da lista.`,
        })
      } catch (error) {
        const message =
          (error as ApiHttpError)?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível excluir o domínio.'

        toast({
          title: 'Erro ao excluir domínio',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [deleteDomain],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domínios"
        description="Controle renovações de domínios e status de DNS para projetos hospedados pela equipe."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Domínios' }]}
        actions={
          <Button
            className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
            onClick={handleOpenCreate}
          >
            Adicionar domínio
          </Button>
        }
      />

      <DomainsTable
        filters={filters}
        page={page}
        pageSize={pageSize}
        clientOptions={clientOptions}
        onFiltersChange={handleFiltersChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteDomain}
      />

      <DomainFormDialog
        open={dialogState.open}
        onOpenChange={handleDialogChange}
        domain={dialogState.domain}
        clients={clientOptions}
        providers={DOMAIN_PROVIDER_OPTIONS}
        statuses={DOMAIN_STATUS_OPTIONS}
        reminders={DOMAIN_REMINDER_OPTIONS}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmitDomain}
      />
    </div>
  )
}
