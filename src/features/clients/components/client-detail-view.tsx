'use client'

import { useCallback, useEffect, useMemo, useState, type FocusEvent, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  CalendarIcon,
  DollarSign,
  FileTextIcon,
  GlobeIcon,
  LayersIcon,
  PenSquareIcon,
  PlusIcon,
  RefreshCw,
  Server,
  TagIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

import { toast } from '@/hooks/use-toast'
import { useConfirm } from '@/hooks/use-confirm'

import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

import {
  CLIENT_STATUS_OPTIONS,
  type Client,
  type ClientContact,
  type ClientContract,
  type ClientDomain,
  type ClientMeeting,
  type CreateClientContactInput,
  type CreateClientContractInput,
  type CreateClientDomainInput,
  type CreateClientMeetingInput,
  type UpdateClientContactInput,
  type UpdateClientContractInput,
  type UpdateClientDomainInput,
  type UpdateClientMeetingInput,
  useClient,
  useClientContacts,
  useClientContracts,
  useClientDomains,
  useClientMeetings,
  useCreateClientContact,
  useCreateClientContract,
  useCreateClientDomain,
  useCreateClientMeeting,
  useDeleteClientContact,
  useDeleteClientContract,
  useDeleteClientDomain,
  useDeleteClientMeeting,
  useUpdateClient,
  useUpdateClientContact,
  useUpdateClientContract,
  useUpdateClientDomain,
  useUpdateClientMeeting,
} from '../api'
import { useQueryClient } from '@tanstack/react-query'
import {
  useClientServices as useClientServicesList,
  useCreateClientService as useCreateClientServiceMutation,
  useUpdateClientService as useUpdateClientServiceMutation,
  useDeleteClientService as useDeleteClientServiceMutation,
  type ClientService,
  type ClientServiceCategory,
  type CreateClientServiceInput,
  type UpdateClientServiceInput,
} from '@/features/client-services/api'
import { useCreateServiceBilling } from '@/features/service-billings/api'
import { ClientServiceDialog, type ClientServiceFormValues } from '@/features/client-services/components/client-service-dialog'

interface ClientDetailViewProps {
  clientId: string
  initialData: Client
}

const summaryCardIcons: Record<'contacts' | 'contracts' | 'services' | 'domains' | 'meetings', ReactNode> = {
  contacts: <UsersIcon className="size-5" />,
  contracts: <FileTextIcon className="size-5" />,
  services: <LayersIcon className="size-5" />,
  domains: <GlobeIcon className="size-5" />,
  meetings: <CalendarIcon className="size-5" />,
}

const summaryLabels: Record<keyof typeof summaryCardIcons, string> = {
  contacts: 'Contatos',
  contracts: 'Contratos',
  services: 'Serviços',
  domains: 'Domínios',
  meetings: 'Reuniões',
}

const serviceStatusStyles: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-200',
  active: 'bg-emerald-500/20 text-emerald-200',
  paused: 'bg-amber-500/20 text-amber-200',
  suspended: 'bg-amber-500/20 text-amber-200',
  terminated: 'bg-rose-500/20 text-rose-200',
}

const serviceCategoryLabels: Record<ClientServiceCategory, string> = {
  APPS: 'Apps',
  SITES: 'Sites',
  SOFTWARE: 'Software',
  AUTOMATIONS: 'Automações',
  OTHERS: 'Outros',
}

const getServiceCategoryLabel = (category?: ClientServiceCategory | null) => {
  if (!category) return 'Serviço personalizado'
  return serviceCategoryLabels[category] ?? category
}

const serviceSupportLabels: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

const serviceCycleLabels: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semester: 'Semestral',
  yearly: 'Anual',
}

const formatCurrencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

const contactSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.string().optional().or(z.literal('')),
})

const contractSchema = z.object({
  title: z.string().min(1, 'Informe o título'),
  status: z.string().min(1, 'Informe o status'),
  totalValue: z.coerce.number().optional().or(z.nan()).transform((value) => (Number.isFinite(value) ? value : undefined)),
  billingCycle: z.string().optional(),
  signedAt: z.string().optional(),
  validUntil: z.string().optional(),
})

const domainSchema = z.object({
  host: z.string().min(1, 'Informe o domínio'),
  provider: z.string().optional(),
  status: z.string().min(1, 'Informe o status'),
  expiresAt: z.string().optional(),
})

const meetingSchema = z.object({
  subject: z.string().min(1, 'Informe o assunto'),
  status: z.string().min(1, 'Informe o status'),
  scheduledAt: z.string().min(1, 'Informe a data'),
  durationMinutes: z.coerce.number().optional().or(z.nan()).transform((value) => (Number.isFinite(value) ? value : undefined)),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export type ContactFormValues = z.infer<typeof contactSchema>
export type ContractFormValues = z.infer<typeof contractSchema>
export type DomainFormValues = z.infer<typeof domainSchema>
export type MeetingFormValues = z.infer<typeof meetingSchema>

const safeFormatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'dd/MM/yyyy')
}

const summaryCount = (resource?: { data?: unknown[] } | null) => resource?.data?.length ?? 0

const tagsToString = (tags?: string[] | null) => tags?.join(', ') ?? ''

const sanitizeEmpty = (value?: string | null) => (value ? value : undefined)
export function ClientDetailView({ clientId, initialData }: ClientDetailViewProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('overview')
  const [contactModal, setContactModal] = useState<{ open: boolean; editing?: ClientContact }>({ open: false })
  const [contractModal, setContractModal] = useState<{ open: boolean; editing?: ClientContract }>({ open: false })
  const [serviceModal, setServiceModal] = useState<{ open: boolean; editing?: ClientService | null }>({ open: false })
  const [domainModal, setDomainModal] = useState<{ open: boolean; editing?: ClientDomain }>({ open: false })
  const [meetingModal, setMeetingModal] = useState<{ open: boolean; editing?: ClientMeeting }>({ open: false })

  const { data: client } = useClient(clientId, initialData)
  const contactsQuery = useClientContacts(clientId)
  const contractsQuery = useClientContracts(clientId)
  const servicesQuery = useClientServicesList({ clientId })
  const domainsQuery = useClientDomains(clientId)
  const meetingsQuery = useClientMeetings(clientId)

  const createContact = useCreateClientContact()
  const updateContact = useUpdateClientContact()
  const deleteContact = useDeleteClientContact()

  const createContract = useCreateClientContract()
  const updateContract = useUpdateClientContract()
  const deleteContract = useDeleteClientContract()

  const createService = useCreateClientServiceMutation()
  const updateService = useUpdateClientServiceMutation()
  const deleteService = useDeleteClientServiceMutation()
  const createServiceBilling = useCreateServiceBilling()

  const createDomain = useCreateClientDomain()
  const updateDomain = useUpdateClientDomain()
  const deleteDomain = useDeleteClientDomain()

  const createMeeting = useCreateClientMeeting()
  const updateMeeting = useUpdateClientMeeting()
  const deleteMeeting = useDeleteClientMeeting()

  const updateClient = useUpdateClient<{ previous?: Client }>({
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['clients', 'detail', clientId] })
      const previous = queryClient.getQueryData<Client>(['clients', 'detail', clientId])
      queryClient.setQueryData<Client>(['clients', 'detail', clientId], (old) => (old ? { ...old, ...input } : old))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['clients', 'detail', clientId], context.previous)
      }
      toast({
        title: 'Não foi possível atualizar o cliente',
        description: 'Tente novamente em instantes.',
      })
    },
    onSuccess: (data) => {
      toast({
        title: 'Cliente atualizado',
        description: `${data.companyName} foi atualizado com sucesso.`,
      })
    },
  })

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', role: '' },
  })

  const contractForm = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      title: '',
      status: 'draft',
      totalValue: undefined,
      billingCycle: 'monthly',
      signedAt: '',
      validUntil: '',
    },
  })

  const domainForm = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { host: '', provider: '', status: 'active', expiresAt: '' },
  })

  const meetingForm = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      subject: '',
      status: 'scheduled',
      scheduledAt: '',
      durationMinutes: undefined,
      location: '',
      notes: '',
    },
  })
  useEffect(() => {
    if (contactModal.open) {
      contactForm.reset({
        name: contactModal.editing?.name ?? '',
        email: contactModal.editing?.email ?? '',
        phone: contactModal.editing?.phone ?? '',
        role: contactModal.editing?.role ?? '',
      })
    }
  }, [contactModal, contactForm])

  useEffect(() => {
    if (contractModal.open) {
      contractForm.reset({
        title: contractModal.editing?.title ?? '',
        status: contractModal.editing?.status ?? 'draft',
        totalValue: contractModal.editing?.totalValue ?? undefined,
        billingCycle: contractModal.editing?.billingCycle ?? 'monthly',
        signedAt: contractModal.editing?.signedAt ?? '',
        validUntil: contractModal.editing?.validUntil ?? '',
      })
    }
  }, [contractModal, contractForm])

  useEffect(() => {
    if (domainModal.open) {
      domainForm.reset({
        host: domainModal.editing?.host ?? '',
        provider: domainModal.editing?.provider ?? '',
        status: domainModal.editing?.status ?? 'active',
        expiresAt: domainModal.editing?.expiresAt ?? '',
      })
    }
  }, [domainModal, domainForm])

  useEffect(() => {
    if (meetingModal.open) {
      meetingForm.reset({
        subject: meetingModal.editing?.subject ?? '',
        status: meetingModal.editing?.status ?? 'scheduled',
        scheduledAt: meetingModal.editing?.scheduledAt ?? '',
        durationMinutes: meetingModal.editing?.durationMinutes ?? undefined,
        location: meetingModal.editing?.location ?? '',
        notes: meetingModal.editing?.notes ?? '',
      })
    }
  }, [meetingModal, meetingForm])

  const handleOpenServiceModal = useCallback(() => {
    setServiceModal({ open: true, editing: null })
  }, [])

  const handleEditService = useCallback((service: ClientService) => {
    setServiceModal({ open: true, editing: service })
  }, [])

  const handleServiceModalChange = useCallback((open: boolean) => {
    if (!open) {
      setServiceModal({ open: false, editing: null })
    }
  }, [])

  const handleDeleteServiceEntry = useCallback(
    async (service: ClientService) => {
      const confirmed = await confirm({
        title: 'Remover serviço',
        description: `Deseja remover o serviço de ${getServiceCategoryLabel(service.category)} do cliente?`,
        confirmText: 'Remover serviço',
        confirmVariant: 'destructive',
      })
      if (!confirmed) return

      try {
        await deleteService.mutateAsync(service.id)
        toast({ title: 'Serviço removido', description: 'O serviço foi removido do cliente.' })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível remover o serviço.'
        toast({ title: 'Erro ao remover serviço', description: message, variant: 'destructive' })
      }
    },
    [confirm, deleteService],
  )

  const handleSubmitServiceForm = useCallback(
    async (values: ClientServiceFormValues) => {
      const assignedClientId = values.clientId || clientId

      const payload: CreateClientServiceInput = {
        clientId: assignedClientId,
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

      try {
        if (serviceModal.editing) {
          await updateService.mutateAsync({ id: serviceModal.editing.id, ...payload } as UpdateClientServiceInput)
          toast({ title: 'Serviço atualizado', description: 'As informações foram salvas.' })
        } else {
          const created = await createService.mutateAsync(payload)
          toast({ title: 'Serviço criado', description: 'O serviço foi adicionado ao cliente.' })

          if (values.createBilling) {
            try {
              await createServiceBilling.mutateAsync({
                clientServiceId: created.id,
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
                description: 'A cobrança recorrente inicial foi criada.',
              })
            } catch (billingError) {
              const billingMessage =
                (billingError as { friendlyMessage?: string })?.friendlyMessage ??
                (billingError as Error)?.message ??
                'Não foi possível criar a cobrança inicial.'
              toast({
                title: 'Cobrança não criada',
                description: billingMessage,
                variant: 'destructive',
              })
            }
          }
        }

        setServiceModal({ open: false, editing: null })
      } catch (error) {
        const message =
          (error as { friendlyMessage?: string })?.friendlyMessage ??
          (error as Error)?.message ??
          'Não foi possível salvar o serviço.'
        toast({ title: 'Erro ao salvar serviço', description: message, variant: 'destructive' })
      }
    },
    [clientId, createService, createServiceBilling, serviceModal.editing, updateService],
  )

  const contactsColumns = useMemo<ColumnDef<ClientContact>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {row.original.role ? <span className="text-xs text-muted-foreground">{row.original.role}</span> : null}
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'E-mail',
        cell: ({ row }) => row.original.email ?? '—',
      },
      {
        accessorKey: 'phone',
        header: 'Telefone',
        cell: ({ row }) => row.original.phone ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Criado em',
        cell: ({ row }) => safeFormatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => setContactModal({ open: true, editing: row.original })}
             >
               <PenSquareIcon className="size-4" />
             </Button>
             <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => handleDeleteContact(row.original)}
             >
               <Trash2Icon className="size-4" />
             </Button>
           </div>
         ),
       },
     ],
     [],
   )

  const contractsColumns = useMemo<ColumnDef<ClientContract>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Título',
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.title}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'totalValue',
        header: 'Valor',
        cell: ({ row }) =>
          row.original.totalValue != null
            ? row.original.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—',
      },
      {
        accessorKey: 'signedAt',
        header: 'Assinado em',
        cell: ({ row }) => safeFormatDate(row.original.signedAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => setContractModal({ open: true, editing: row.original })}
             >
               <PenSquareIcon className="size-4" />
             </Button>
             <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => handleDeleteContract(row.original)}
             >
               <Trash2Icon className="size-4" />
             </Button>
           </div>
         ),
       },
     ],
     [],
   )

  const clientServices = useMemo(() => servicesQuery.data?.data ?? [], [servicesQuery.data?.data])

  const domainsColumns = useMemo<ColumnDef<ClientDomain>[]>(
    () => [
      {
        accessorKey: 'host',
        header: 'Domínio',
        cell: ({ row }) => row.original.host,
      },
      {
        accessorKey: 'provider',
        header: 'Fornecedor',
        cell: ({ row }) => row.original.provider ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge>{row.original.status}</Badge>,
      },
      {
        accessorKey: 'expiresAt',
        header: 'Expira em',
        cell: ({ row }) => safeFormatDate(row.original.expiresAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => setDomainModal({ open: true, editing: row.original })}
             >
               <PenSquareIcon className="size-4" />
             </Button>
             <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => handleDeleteDomain(row.original)}
             >
               <Trash2Icon className="size-4" />
             </Button>
           </div>
         ),
       },
     ],
     [],
   )

  const meetingsColumns = useMemo<ColumnDef<ClientMeeting>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: 'Assunto',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.subject}</span>
            {row.original.location ? (
              <span className="text-xs text-muted-foreground">{row.original.location}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Agendada para',
        cell: ({ row }) => safeFormatDate(row.original.scheduledAt),
      },
      {
        accessorKey: 'durationMinutes',
        header: 'Duração',
        cell: ({ row }) => (row.original.durationMinutes ? `${row.original.durationMinutes} min` : '—'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => setMeetingModal({ open: true, editing: row.original })}
             >
               <PenSquareIcon className="size-4" />
             </Button>
             <Button
              type="button"
               size="icon"
               variant="ghost"
               className="size-8"
               onClick={() => handleDeleteMeeting(row.original)}
             >
               <Trash2Icon className="size-4" />
             </Button>
           </div>
         ),
       },
     ],
     [],
   )
  const handleDeleteContact = useCallback(
    async (contact: ClientContact) => {
      try {
        await deleteContact.mutateAsync({ clientId, id: contact.id })
        toast({ title: 'Contato removido', description: `${contact.name} foi removido.` })
      } catch (error) {
        toast({
          title: 'Erro ao remover contato',
          description: error instanceof Error ? error.message : 'Não foi possível remover o contato.',
        })
      }
    },
    [clientId, deleteContact],
  )

  const handleDeleteContract = useCallback(
    async (contract: ClientContract) => {
      try {
        await deleteContract.mutateAsync({ clientId, id: contract.id })
        toast({ title: 'Contrato removido', description: `${contract.title} foi removido.` })
      } catch (error) {
        toast({
          title: 'Erro ao remover contrato',
          description: error instanceof Error ? error.message : 'Não foi possível remover o contrato.',
        })
      }
    },
    [clientId, deleteContract],
  )

  const handleDeleteDomain = useCallback(
    async (domain: ClientDomain) => {
      try {
        await deleteDomain.mutateAsync({ clientId, id: domain.id })
        toast({ title: 'Domínio removido', description: `${domain.host} foi removido.` })
      } catch (error) {
        toast({
          title: 'Erro ao remover domínio',
          description: error instanceof Error ? error.message : 'Não foi possível remover o domínio.',
        })
      }
    },
    [clientId, deleteDomain],
  )

  const handleDeleteMeeting = useCallback(
    async (meeting: ClientMeeting) => {
      try {
        await deleteMeeting.mutateAsync({ clientId, id: meeting.id })
        toast({ title: 'Reunião removida', description: `${meeting.subject} foi removida.` })
      } catch (error) {
        toast({
          title: 'Erro ao remover reunião',
          description: error instanceof Error ? error.message : 'Não foi possível remover a reunião.',
        })
      }
    },
    [clientId, deleteMeeting],
  )

  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!client) return
      await updateClient.mutateAsync({ ...client, id: client.id, status })
    },
    [client, updateClient],
  )

  const handleTagsBlur = useCallback(
    async (event: FocusEvent<HTMLInputElement>) => {
      if (!client) return
      const value = event.currentTarget.value
      const tags = value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      await updateClient.mutateAsync({ ...client, id: client.id, tags })
      toast({ title: 'Tags atualizadas', description: 'Os rótulos do cliente foram atualizados.' })
    },
    [client, updateClient],
  )

  const renderTable = (table: ReturnType<typeof useReactTable>, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-12">
          <Spinner />
        </div>
      )
    }

    if (table.getRowModel().rows.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-12 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado.
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }
  const handleSubmitContact = contactForm.handleSubmit(async (values) => {
    const payload: CreateClientContactInput | UpdateClientContactInput = contactModal.editing
      ? { ...values, clientId, id: contactModal.editing.id }
      : { ...values, clientId }

    try {
      if (contactModal.editing) {
        await updateContact.mutateAsync(payload as UpdateClientContactInput)
        toast({ title: 'Contato atualizado', description: `${values.name} foi atualizado.` })
      } else {
        await createContact.mutateAsync(payload as CreateClientContactInput)
        toast({ title: 'Contato criado', description: `${values.name} foi adicionado ao cliente.` })
      }
      setContactModal({ open: false })
    } catch (error) {
      toast({
        title: 'Erro ao salvar contato',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o contato.',
      })
    }
  })

  const handleSubmitContract = contractForm.handleSubmit(async (values) => {
    const payload: CreateClientContractInput | UpdateClientContractInput = contractModal.editing
      ? { ...values, clientId, id: contractModal.editing.id }
      : { ...values, clientId }

    try {
      let result: ClientContract
      if (contractModal.editing) {
        result = await updateContract.mutateAsync(payload as UpdateClientContractInput)
        toast({ title: 'Contrato atualizado', description: `${values.title} foi atualizado.` })
      } else {
        result = await createContract.mutateAsync(payload as CreateClientContractInput)
        toast({ title: 'Contrato criado', description: `${values.title} foi criado.` })
        toast({
          title: 'Próximo passo sugerido',
          description: 'Cadastre o serviço contratado para acompanhar entregas e cobranças.',
          action: (
            <Button variant="outline" size="sm" onClick={handleOpenServiceModal}>
              Criar serviço
            </Button>
          ),
        })
      }
      setContractModal({ open: false })
    } catch (error) {
      toast({
        title: 'Erro ao salvar contrato',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o contrato.',
      })
    }
  })

  const handleSubmitDomain = domainForm.handleSubmit(async (values) => {
    const payload: CreateClientDomainInput | UpdateClientDomainInput = domainModal.editing
      ? { ...values, clientId, id: domainModal.editing.id }
      : { ...values, clientId }

    try {
      if (domainModal.editing) {
        await updateDomain.mutateAsync(payload as UpdateClientDomainInput)
        toast({ title: 'Domínio atualizado', description: `${values.host} foi atualizado.` })
      } else {
        await createDomain.mutateAsync(payload as CreateClientDomainInput)
        toast({ title: 'Domínio criado', description: `${values.host} foi criado para o cliente.` })
      }
      setDomainModal({ open: false })
    } catch (error) {
      toast({
        title: 'Erro ao salvar domínio',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o domínio.',
      })
    }
  })

  const handleSubmitMeeting = meetingForm.handleSubmit(async (values) => {
    const payload: CreateClientMeetingInput | UpdateClientMeetingInput = meetingModal.editing
      ? { ...values, clientId, id: meetingModal.editing.id }
      : { ...values, clientId }

    try {
      if (meetingModal.editing) {
        await updateMeeting.mutateAsync(payload as UpdateClientMeetingInput)
        toast({ title: 'Reunião atualizada', description: `${values.subject} foi atualizada.` })
      } else {
        await createMeeting.mutateAsync(payload as CreateClientMeetingInput)
        toast({ title: 'Reunião criada', description: `${values.subject} foi agendada.` })
      }
      setMeetingModal({ open: false })
    } catch (error) {
      toast({
        title: 'Erro ao salvar reunião',
        description: error instanceof Error ? error.message : 'Não foi possível salvar a reunião.',
      })
    }
  })
  const contactsTable = useReactTable({
    data: contactsQuery.data?.data ?? [],
    columns: contactsColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const contractsTable = useReactTable({
    data: contractsQuery.data?.data ?? [],
    columns: contractsColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const domainsTable = useReactTable({
    data: domainsQuery.data?.data ?? [],
    columns: domainsColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const meetingsTable = useReactTable({
    data: meetingsQuery.data?.data ?? [],
    columns: meetingsColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const summary = {
    contacts: summaryCount(contactsQuery.data),
    contracts: summaryCount(contractsQuery.data),
    services: summaryCount(servicesQuery.data),
    domains: summaryCount(domainsQuery.data),
    meetings: summaryCount(meetingsQuery.data),
  }

  const handleContactModalChange = useCallback((open: boolean) => {
    setContactModal((previous) => (open ? { ...previous, open: true } : { open: false }))
  }, [])

  const handleContractModalChange = useCallback((open: boolean) => {
    setContractModal((previous) => (open ? { ...previous, open: true } : { open: false }))
  }, [])

  const handleDomainModalChange = useCallback((open: boolean) => {
    setDomainModal((previous) => (open ? { ...previous, open: true } : { open: false }))
  }, [])

  const handleMeetingModalChange = useCallback((open: boolean) => {
    setMeetingModal((previous) => (open ? { ...previous, open: true } : { open: false }))
  }, [])
  return (
    <div className="space-y-6">
      <PageHeader
        title={client?.companyName ?? 'Cliente'}
        description={client?.tradeName ?? undefined}
        breadcrumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/clients', label: 'Clientes' },
          { label: client?.companyName ?? 'Detalhes' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
              <span className="text-xs uppercase tracking-wide text-white/70">Status</span>
              <Select value={client?.status ?? 'lead'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-28 rounded-full border-none bg-transparent text-white focus:ring-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
              <TagIcon className="size-4 text-white/60" />
              <Input
                defaultValue={tagsToString(client?.tags)}
                onBlur={handleTagsBlur}
                placeholder="tags separadas por vírgula"
                className="h-7 w-48 border-none bg-transparent text-xs text-white placeholder:text-white/60 focus-visible:ring-0"
              />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(summaryCardIcons) as Array<keyof typeof summaryCardIcons>).map((key) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-white/70">{summaryLabels[key]}</span>
              <span>{summaryCardIcons[key]}</span>
            </div>
            <p className="mt-3 text-3xl font-semibold">{summary[key]}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-2 rounded-2xl bg-white/10 p-1">
          <TabsTrigger value="overview" className="rounded-2xl px-4 py-2 data-[state=active]:bg-white/25">
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-2xl px-4 py-2 data-[state=active]:bg-white/25">
            Contatos
          </TabsTrigger>
          <TabsTrigger value="contracts" className="rounded-2xl px-4 py-2 data-[state=active]:bg-white/25">
            Contratos
          </TabsTrigger>
          <TabsTrigger value="services" className="rounded-2xl px-4 py-2 data-[state=active]:bg-white/25">
            Serviços
          </TabsTrigger>
          <TabsTrigger value="domains" className="rounded-2xl px-4 py-2 data-[state=active]:bg-white/25">
            Domínios
          </TabsTrigger>
          <TabsTrigger value="meetings" className="rounded-2xl px-4 py-2 data-[state=active]:bg-white/25">
            Reuniões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 text-white">
            <h3 className="text-lg font-semibold">Informações principais</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Razão social" value={client?.companyName} />
              <InfoRow label="Nome fantasia" value={client?.tradeName} />
              <InfoRow label="CNPJ" value={client?.cnpj} />
              <InfoRow label="Segmento" value={client?.segment} />
              <InfoRow label="Telefone" value={client?.phone} />
              <InfoRow label="E-mail" value={client?.email} />
            </div>
            {client?.notes ? (
              <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-white/70">Notas</h4>
                <p>{client.notes}</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <SectionHeader
            title="Contatos"
            description="Pessoas responsáveis e contatos-chave do cliente."
            actionLabel="Adicionar contato"
            onAction={() => setContactModal({ open: true })}
          />
          {renderTable(contactsTable, contactsQuery.isLoading)}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <SectionHeader
            title="Contratos"
            description="Contratos ativos, pendentes e históricos."
            actionLabel="Novo contrato"
            onAction={() => setContractModal({ open: true })}
          />
          {renderTable(contractsTable, contractsQuery.isLoading)}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <SectionHeader
            title="Serviços"
            description="Serviços ativos, responsáveis e status operacionais do cliente."
            actionLabel="Novo serviço"
            onAction={handleOpenServiceModal}
          />

          {servicesQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-3xl bg-white/10" />
              ))}
            </div>
          ) : clientServices.length === 0 ? (
            <EmptyPlaceholder
              title="Nenhum serviço cadastrado"
              description="Crie um serviço para acompanhar entregáveis, cobranças e responsáveis."
            >
              <Button onClick={handleOpenServiceModal}>
                <LayersIcon className="mr-2 size-4" /> Novo serviço
              </Button>
            </EmptyPlaceholder>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {clientServices.map((service) => {
                const statusStyle = serviceStatusStyles[service.status] ?? 'bg-white/10 text-white'
                const monthly = formatCurrencyBRL(service.monthlyFee)
                const development = formatCurrencyBRL(service.developmentFee)

                return (
                  <div
                    key={service.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Badge className={`${statusStyle} border border-white/20 px-3 py-1 text-xs`}>{service.status}</Badge>
                        <h3 className="text-base font-semibold text-white">
                          {getServiceCategoryLabel(service.category)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                          {service.supportLevel ? (
                            <span>{serviceSupportLabels[service.supportLevel] ?? service.supportLevel}</span>
                          ) : null}
                          {service.billingCycle ? (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="size-3" />
                              {serviceCycleLabels[service.billingCycle] ?? service.billingCycle}
                            </span>
                          ) : null}
                          {monthly ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="size-3" />
                              {monthly}
                            </span>
                          ) : null}
                          {development ? <span>Desenvolvimento: {development}</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => handleEditService(service)}
                        >
                          <PenSquareIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteServiceEntry(service)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-white/70">
                      {service.responsible?.name ? (
                        <p>
                          Responsável: <strong>{service.responsible.name}</strong>{' '}
                          {service.responsible.role ? `(${service.responsible.role})` : null}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        {service.startDate ? (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            Início: {safeFormatDate(service.startDate)}
                          </span>
                        ) : null}
                        {service.goLiveDate ? (
                          <span className="flex items-center gap-1">
                            <Server className="size-3" />
                            Go-live: {safeFormatDate(service.goLiveDate)}
                          </span>
                        ) : null}
                        {service.endDate ? (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            Fim: {safeFormatDate(service.endDate)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <SectionHeader
            title="Domínios"
            description="Domínios monitorados e serviços digitais."
            actionLabel="Novo domínio"
            onAction={() => setDomainModal({ open: true })}
          />
          {renderTable(domainsTable, domainsQuery.isLoading)}
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <SectionHeader
            title="Reuniões"
            description="Histórico de reuniões e próximos encontros."
            actionLabel="Nova reunião"
            onAction={() => router.push(`/meetings?clientId=${clientId}&new=1`)}
          />
          {renderTable(meetingsTable, meetingsQuery.isLoading)}
        </TabsContent>
      </Tabs>

      <Dialog open={contactModal.open} onOpenChange={handleContactModalChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contactModal.editing ? 'Editar contato' : 'Adicionar contato'}</DialogTitle>
            <DialogDescription>Cadastre pessoas-chave para facilitar seu relacionamento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitContact} className="space-y-4">
            <FormField
              control={contactForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={contactForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={contactForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={contactForm.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Cargo" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Salvar contato</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contractModal.open} onOpenChange={handleContractModalChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{contractModal.editing ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
            <DialogDescription>Organize seus contratos e prazos de renovação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitContract} className="grid gap-4">
            <FormField
              control={contractForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Contrato" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={contractForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Input placeholder="Status" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={contractForm.control}
                name="totalValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={contractForm.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo</FormLabel>
                    <FormControl>
                      <Input placeholder="mensal" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={contractForm.control}
                name="signedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assinado em</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={contractForm.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Válido até</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Salvar contrato</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ClientServiceDialog
        open={serviceModal.open}
        onOpenChange={handleServiceModalChange}
        service={serviceModal.editing ?? null}
        clientId={clientId}
        isSubmitting={createService.isPending || updateService.isPending || createServiceBilling.isPending}
        onSubmit={handleSubmitServiceForm}
      />


      <Dialog open={domainModal.open} onOpenChange={handleDomainModalChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{domainModal.editing ? 'Editar domínio' : 'Novo domínio'}</DialogTitle>
            <DialogDescription>Gerencie domínios e serviços digitais vinculados.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDomain} className="grid gap-4">
            <FormField
              control={domainForm.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domínio</FormLabel>
                  <FormControl>
                    <Input placeholder="exemplo.com" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={domainForm.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Registro.br" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={domainForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Input placeholder="ativo" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={domainForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expira em</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar domínio</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={meetingModal.open} onOpenChange={handleMeetingModalChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{meetingModal.editing ? 'Editar reunião' : 'Nova reunião'}</DialogTitle>
            <DialogDescription>Registre reuniões e interações importantes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMeeting} className="grid gap-4">
            <FormField
              control={meetingForm.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Reunião" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={meetingForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Input placeholder="agendada" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={meetingForm.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={meetingForm.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="60" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={meetingForm.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Local ou link" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={meetingForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Resumo do encontro" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Salvar reunião</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value?: string | null
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-white/60">{label}</span>
      <p className="text-sm font-medium text-white">{value ?? '—'}</p>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

function SectionHeader({ title, description, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-white/70">{description}</p>
      </div>
      <Button onClick={onAction} className="self-start rounded-full bg-white/20 text-white hover:bg-white/30">
        <PlusIcon className="mr-2 size-4" />
        {actionLabel}
      </Button>
    </div>
  )
}
