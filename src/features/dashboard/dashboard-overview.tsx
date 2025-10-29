'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, FileText, Globe, TrendingUp, Users, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'

import {
  useDomainExpirations,
  useInvoiceStats,
  useUpcomingMeetings,
  type DomainExpiration,
  type InvoiceStatusSummary,
  type UpcomingMeeting,
} from './api'
import { DashboardKpi } from './components/dashboard-kpi'
import { MiniTable } from './components/mini-table'
import { QuickActions } from './components/quick-actions'

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

const formatInvoiceCount = (count: number) =>
  `${count} ${count === 1 ? 'fatura' : 'faturas'}`

const buildTrend = (summary?: InvoiceStatusSummary) => {
  if (!summary || summary.trendPercentage === undefined || summary.trendPercentage === null) {
    return undefined
  }

  const variant = summary.trendPercentage > 0 ? 'positive' : summary.trendPercentage < 0 ? 'negative' : 'neutral'
  const label = `${summary.trendPercentage > 0 ? '+' : ''}${summary.trendPercentage.toFixed(1)}% vs período anterior`

  return { label, variant }
}

const normalizeStatus = (value: string) => value.toLowerCase().replace(/\s+/g, '_')

const getDomainStatusStyles = (status: string) => {
  const normalized = normalizeStatus(status)

  if (['expired', 'vencido'].includes(normalized)) {
    return 'border-rose-400/40 bg-rose-500/20 text-rose-200'
  }

  if (['expiring', 'vencendo', 'due_soon'].includes(normalized)) {
    return 'border-amber-400/40 bg-amber-500/20 text-amber-100'
  }

  return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
}

const getMeetingStatusStyles = (status: string) => {
  const normalized = normalizeStatus(status)

  if (['confirmed', 'confirmada'].includes(normalized)) {
    return 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
  }

  if (['pending', 'aguardando'].includes(normalized)) {
    return 'border-amber-400/40 bg-amber-500/20 text-amber-100'
  }

  if (['canceled', 'cancelada'].includes(normalized)) {
    return 'border-rose-400/40 bg-rose-500/20 text-rose-200'
  }

  return 'border-white/20 bg-white/10 text-white/70'
}

const getSummaryByStatus = (summaries: InvoiceStatusSummary[], ...statuses: string[]) => {
  const normalizedStatuses = statuses.map((status) => normalizeStatus(status))
  return summaries.find((summary) => normalizedStatuses.includes(normalizeStatus(summary.status)))
}

export function DashboardOverview() {
  const router = useRouter()

  const { data: invoiceStats, isLoading: isLoadingInvoices } = useInvoiceStats({ dueInDays: 7 })
  const { data: domainExpirations = [], isLoading: isLoadingDomains } = useDomainExpirations({ dueInHours: 72 })
  const { data: upcomingMeetings = [], isLoading: isLoadingMeetings } = useUpcomingMeetings({ withinHours: 72 })
  const followUpMeetings = useMemo(() => upcomingMeetings.slice(0, 5), [upcomingMeetings])

  const invoiceSummaries = invoiceStats?.summaries ?? []
  const currency = invoiceStats?.currency ?? 'BRL'

  const totalSummary = getSummaryByStatus(invoiceSummaries, 'total')
  const overdueSummary = getSummaryByStatus(invoiceSummaries, 'overdue', 'vencida', 'em_atraso')
  const dueSoonSummary = getSummaryByStatus(invoiceSummaries, 'due_soon', 'dueSoon', 'vencendo')
  const paidSummary = getSummaryByStatus(invoiceSummaries, 'paid', 'paga')

  const domainColumns = useMemo<ColumnDef<DomainExpiration>[]>(
    () => [
      {
        accessorKey: 'domain',
        header: 'Domínio',
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-white">{item.domain}</span>
              <span className="text-xs text-white/60">{item.clientName}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'expiresAt',
        header: 'Vencimento',
        cell: ({ row }) => {
          const item = row.original
          const expiresAt = new Date(item.expiresAt)
          if (Number.isNaN(expiresAt.getTime())) {
            return <span>—</span>
          }

          return (
            <div className="flex flex-col">
              <span>{format(expiresAt, 'dd/MM/yyyy')}</span>
              <span className="text-xs text-white/60">
                {formatDistanceToNow(expiresAt, { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const item = row.original
          return (
            <Badge
              variant="secondary"
              className={`border ${getDomainStatusStyles(item.status)}`}
            >
              {item.status}
            </Badge>
          )
        },
      },
    ],
    [],
  )

  const meetingColumns = useMemo<ColumnDef<UpcomingMeeting>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Reunião',
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-white">{item.title}</span>
              <span className="text-xs text-white/60">Com {item.with}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'scheduledFor',
        header: 'Data',
        cell: ({ row }) => {
          const item = row.original
          const scheduledFor = new Date(item.scheduledFor)

          if (Number.isNaN(scheduledFor.getTime())) {
            return <span>—</span>
          }

          return (
            <div className="flex flex-col">
              <span>{format(scheduledFor, "dd/MM 'às' HH:mm")}</span>
              <span className="text-xs text-white/60">{item.channel}</span>
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const item = row.original
          return (
            <Badge
              variant="secondary"
              className={`border ${getMeetingStatusStyles(item.status)}`}
            >
              {item.status}
            </Badge>
          )
        },
      },
    ],
    [],
  )

  const quickActions = [
    {
      label: 'Emitir fatura',
      description: 'Gere uma nova cobrança para o cliente.',
      icon: FileText,
      href: '/invoices?create=manual',
    },
    {
      label: 'Marcar reunião',
      description: 'Agende follow-ups prioritários.',
      icon: Calendar,
      href: '/meetings/new',
    },
    {
      label: 'Adicionar domínio',
      description: 'Controle renovações de DNS críticos.',
      icon: Globe,
      href: '/domains?create=1',
    },
    {
      label: 'Novo contato',
      description: 'Cadastre leads e decisores.',
      icon: Users,
      href: '/clients/new',
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="space-y-6 lg:col-span-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpi
            title="Receita total"
            value={formatCurrency(totalSummary?.totalAmount ?? 0, currency)}
            helperText={formatInvoiceCount(totalSummary?.totalInvoices ?? 0)}
            trend={buildTrend(totalSummary)}
            icon={DollarSign}
            isLoading={isLoadingInvoices}
            onClick={() => router.push('/invoices')}
          />
          <DashboardKpi
            title="Faturas em atraso"
            value={formatCurrency(overdueSummary?.totalAmount ?? 0, currency)}
            helperText={formatInvoiceCount(overdueSummary?.totalInvoices ?? 0)}
            trend={buildTrend(overdueSummary)}
            icon={TrendingUp}
            isLoading={isLoadingInvoices}
            onClick={() => router.push('/invoices?status=overdue')}
          />
          <DashboardKpi
            title="Vencem em 7 dias"
            value={formatCurrency(dueSoonSummary?.totalAmount ?? 0, currency)}
            helperText={formatInvoiceCount(dueSoonSummary?.totalInvoices ?? 0)}
            trend={buildTrend(dueSoonSummary)}
            icon={Calendar}
            isLoading={isLoadingInvoices}
            onClick={() => router.push('/invoices?status=pending&dueIn=7')}
          />
          <DashboardKpi
            title="Pagas no período"
            value={formatCurrency(paidSummary?.totalAmount ?? 0, currency)}
            helperText={formatInvoiceCount(paidSummary?.totalInvoices ?? 0)}
            trend={buildTrend(paidSummary)}
            icon={FileText}
            isLoading={isLoadingInvoices}
            onClick={() => router.push('/invoices?status=paid&period=30')}
          />
        </div>

        <MiniTable<DomainExpiration>
          title="Domínios para renovar"
          description="Monitore renovações críticas previstas para as próximas 72 horas."
          columns={domainColumns}
          data={domainExpirations}
          isLoading={isLoadingDomains}
          emptyState={{
            title: 'Nenhum domínio perto de expirar',
            description: 'Acompanhe aqui os domínios que exigem renovação para evitar indisponibilidade.',
          }}
          action={{
            label: 'Ver todos',
            onClick: () => router.push('/domains?dueIn=7'),
          }}
        />
      </section>

      <section className="space-y-6 lg:col-span-4">
        <MiniTable<UpcomingMeeting>
          title="Próximas reuniões"
          description="Acompanhe os compromissos confirmados para as próximas 72 horas."
          columns={meetingColumns}
          data={upcomingMeetings}
          isLoading={isLoadingMeetings}
          emptyState={{
            title: 'Sem reuniões próximas',
            description: 'Agende novas interações para manter o relacionamento aquecido.',
          }}
          action={{
            label: 'Ver agenda',
            onClick: () => router.push('/meetings?within=72'),
          }}
        />

        <QuickActions actions={quickActions} />

        <MiniTable<UpcomingMeeting>
          title="Follow-ups prioritários"
          description="Conversas recentes que precisam de um retorno rápido."
          columns={[
            {
              accessorKey: 'title',
              header: 'Contato',
              cell: ({ row }) => {
                const item = row.original
                return (
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{item.title}</span>
                    <span className="text-xs text-white/60">{item.with}</span>
                  </div>
                )
              },
            },
            {
              accessorKey: 'scheduledFor',
              header: 'Última interação',
              cell: ({ row }) => {
                const item = row.original
                const date = new Date(item.scheduledFor)
                if (Number.isNaN(date.getTime())) {
                  return <span>—</span>
                }

                return (
                  <span className="text-sm text-white/80">
                    {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
                  </span>
                )
              },
            },
            {
              id: 'status',
              header: 'Status',
              cell: ({ row }) => {
                const item = row.original
                return (
                  <Badge
                    variant="secondary"
                    className={`border ${getMeetingStatusStyles(item.status)}`}
                  >
                    {item.status}
                  </Badge>
                )
              },
            },
          ]}
          data={followUpMeetings}
          isLoading={isLoadingMeetings}
          emptyState={{
            title: 'Sem follow-ups pendentes',
            description: 'Assim que houver interações aguardando retorno, elas aparecerão aqui.',
          }}
          action={{
            label: 'Central de mensagens',
            onClick: () => router.push('/messages'),
          }}
        />
      </section>
    </div>
  )
}
