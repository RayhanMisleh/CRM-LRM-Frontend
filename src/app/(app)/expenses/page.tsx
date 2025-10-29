'use client'

import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { PageHeader } from '@/features/layout/header/page-header'
import {
  ExpenseFormDialog,
  type ExpenseFormValues,
} from '@/features/expenses/components/expense-form-dialog'
import { ExpensesTable } from '@/features/expenses/components/expenses-table'
import { useCreateExpense, useExpenses, type ApiHttpError } from '@/features/expenses/api'
import {
  RecurringExpenseFormDialog,
  type RecurringExpenseFormValues,
} from '@/features/recurring-expenses/components/recurring-expense-form-dialog'
import { RecurringExpensesTable } from '@/features/recurring-expenses/components/recurring-expenses-table'
import {
  useCreateRecurringExpense,
  useGenerateRecurringExpense,
  useRecurringExpenses,
  type RecurringExpense,
} from '@/features/recurring-expenses/api'
import { toast } from '@/hooks/use-toast'

const expenseTypeFilterOptions = [
  { label: 'Todos', value: '' },
  { label: 'Serviço', value: 'service' },
  { label: 'Produto', value: 'product' },
  { label: 'Folha de pagamento', value: 'payroll' },
  { label: 'Impostos e taxas', value: 'tax' },
  { label: 'Outros', value: 'fee' },
]

const expenseStatusFilterOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Pago', value: 'paid' },
  { label: 'Atrasado', value: 'overdue' },
  { label: 'Programado', value: 'scheduled' },
]

const expenseDueFilterOptions = [
  { label: 'Todos', value: '' },
  { label: 'Hoje', value: 'today' },
  { label: 'Próximos 7 dias', value: '7' },
  { label: 'Próximos 30 dias', value: '30' },
  { label: 'Atrasados', value: 'overdue' },
]

const recurringStatusFilterOptions = [
  { label: 'Todos', value: '' },
  { label: 'Ativa', value: 'active' },
  { label: 'Pausada', value: 'paused' },
  { label: 'Cancelada', value: 'cancelled' },
]

const recurringDueFilterOptions = [
  { label: 'Todos', value: '' },
  { label: 'Próximos 7 dias', value: '7' },
  { label: 'Próximos 30 dias', value: '30' },
  { label: 'Atrasadas', value: 'overdue' },
]

const formatCurrency = (value: number, currency: string = 'BRL') => {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }
}

interface SummaryCardProps {
  title: string
  value: string
  loading?: boolean
  badge?: string
}

function SummaryCard({ title, value, loading, badge }: SummaryCardProps) {
  return (
    <Card className="border-border/40 bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {title}
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-semibold">{value}</p>}</CardContent>
    </Card>
  )
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<'entries' | 'recurring'>('entries')
  const [expenseFilters, setExpenseFilters] = useState({
    type: '',
    status: '',
    costCenter: '',
    dueIn: '',
  })
  const [recurringFilters, setRecurringFilters] = useState({
    type: '',
    status: '',
    costCenter: '',
    dueIn: '',
  })
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const normalizedExpenseFilters = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      type: expenseFilters.type || undefined,
      status: expenseFilters.status || undefined,
      costCenter: expenseFilters.costCenter || undefined,
      dueIn: expenseFilters.dueIn || undefined,
    }),
    [expenseFilters.costCenter, expenseFilters.dueIn, expenseFilters.status, expenseFilters.type],
  )

  const normalizedRecurringFilters = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      type: recurringFilters.type || undefined,
      status: recurringFilters.status || undefined,
      costCenter: recurringFilters.costCenter || undefined,
      dueIn: recurringFilters.dueIn || undefined,
    }),
    [recurringFilters.costCenter, recurringFilters.dueIn, recurringFilters.status, recurringFilters.type],
  )

  const expensesQuery = useExpenses(normalizedExpenseFilters)
  const recurringQuery = useRecurringExpenses(normalizedRecurringFilters)

  const createExpense = useCreateExpense()
  const createRecurringExpense = useCreateRecurringExpense()
  const generateRecurringExpense = useGenerateRecurringExpense()

  const expenses = expensesQuery.data?.data ?? []
  const recurringExpenses = recurringQuery.data?.data ?? []

  const expenseCurrency = expenses[0]?.currency ?? 'BRL'
  const recurringCurrency = recurringExpenses[0]?.currency ?? 'BRL'

  const expenseTotals = useMemo(() => {
    const baseTotal = expenses.reduce((total, expense) => total + (expense.amount ?? 0), 0)
    const pendingTotal = expenses
      .filter((expense) => {
        const status = String(expense.status ?? '').toLowerCase()
        return status === 'pending' || status === 'scheduled'
      })
      .reduce((total, expense) => total + (expense.amount ?? 0), 0)
    const overdueTotal = expenses
      .filter((expense) => String(expense.status ?? '').toLowerCase() === 'overdue')
      .reduce((total, expense) => total + (expense.amount ?? 0), 0)

    return {
      total: expensesQuery.data?.meta?.totalAmount ?? baseTotal,
      pending: expensesQuery.data?.meta?.totalPendingAmount ?? pendingTotal,
      overdue: expensesQuery.data?.meta?.totalOverdueAmount ?? overdueTotal,
    }
  }, [expenses, expensesQuery.data?.meta?.totalAmount, expensesQuery.data?.meta?.totalOverdueAmount, expensesQuery.data?.meta?.totalPendingAmount])

  const recurringTotals = useMemo(() => {
    const activeTotal = recurringExpenses
      .filter((expense) => String(expense.status ?? '').toLowerCase() === 'active')
      .reduce((total, expense) => total + (expense.amount ?? 0), 0)
    const pausedTotal = recurringExpenses
      .filter((expense) => String(expense.status ?? '').toLowerCase() === 'paused')
      .reduce((total, expense) => total + (expense.amount ?? 0), 0)

    return {
      total: recurringQuery.data?.meta?.totalAmount ?? recurringExpenses.reduce((total, expense) => total + (expense.amount ?? 0), 0),
      active: activeTotal,
      paused: pausedTotal,
    }
  }, [recurringExpenses, recurringQuery.data?.meta?.totalAmount])

  const handleExpenseSubmit = async (values: ExpenseFormValues) => {
    try {
      await createExpense.mutateAsync({
        title: values.title,
        description: values.description?.trim() ? values.description.trim() : undefined,
        type: values.type,
        status: values.status,
        amount: values.amount,
        currency: values.currency,
        dueDate: values.dueDate || undefined,
        costCenter: values.costCenter?.trim() ? values.costCenter.trim() : undefined,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      })
      toast({
        title: 'Despesa registrada',
        description: 'O lançamento foi adicionado ao fluxo de caixa.',
      })
      setExpenseDialogOpen(false)
    } catch (error) {
      const apiError = error as ApiHttpError
      toast({
        variant: 'destructive',
        title: 'Não foi possível registrar a despesa',
        description: apiError?.friendlyMessage ?? 'Tente novamente em instantes.',
      })
    }
  }

  const handleRecurringSubmit = async (values: RecurringExpenseFormValues) => {
    try {
      await createRecurringExpense.mutateAsync({
        title: values.title,
        description: values.description?.trim() ? values.description.trim() : undefined,
        type: values.type,
        status: values.status,
        amount: values.amount,
        currency: values.currency,
        frequency: values.frequency,
        firstDueDate: values.firstDueDate || undefined,
        costCenter: values.costCenter?.trim() ? values.costCenter.trim() : undefined,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      })
      toast({
        title: 'Recorrência criada',
        description: 'A despesa recorrente será gerada automaticamente.',
      })
      setRecurringDialogOpen(false)
    } catch (error) {
      const apiError = error as ApiHttpError
      toast({
        variant: 'destructive',
        title: 'Não foi possível criar a recorrência',
        description: apiError?.friendlyMessage ?? 'Tente novamente em instantes.',
      })
    }
  }

  const handleGenerateRecurring = async (expense: RecurringExpense) => {
    setGeneratingId(expense.id)
    try {
      await generateRecurringExpense.mutateAsync({ id: expense.id })
      toast({
        title: 'Lançamento gerado',
        description: `${expense.title} teve um lançamento criado manualmente.`,
      })
    } catch (error) {
      const apiError = error as ApiHttpError
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar lançamento',
        description: apiError?.friendlyMessage ?? 'Verifique a conexão e tente novamente.',
      })
    } finally {
      setGeneratingId(null)
    }
  }

  const isExpensesLoading = expensesQuery.isLoading || expensesQuery.isFetching
  const isRecurringLoading = recurringQuery.isLoading || recurringQuery.isFetching

  return (
    <div className="space-y-6">
      <PageHeader
        title="Despesas"
        description="Monitore custos operacionais, lançamentos recorrentes e aprovação de despesas."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Despesas' }]}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'entries' | 'recurring')}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-background/50">
            <TabsTrigger value="entries">Lançamentos</TabsTrigger>
            <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
          </TabsList>
          <Button
            onClick={() => (activeTab === 'entries' ? setExpenseDialogOpen(true) : setRecurringDialogOpen(true))}
            className="rounded-2xl"
          >
            {activeTab === 'entries' ? 'Registrar despesa' : 'Nova recorrência'}
          </Button>
        </div>

        <TabsContent value="entries" className="space-y-6">
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Tipo</Label>
                <Select
                  value={expenseFilters.type}
                  onValueChange={(value) => setExpenseFilters((previous) => ({ ...previous, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypeFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                <Select
                  value={expenseFilters.status}
                  onValueChange={(value) => setExpenseFilters((previous) => ({ ...previous, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseStatusFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Vencimento</Label>
                <Select
                  value={expenseFilters.dueIn}
                  onValueChange={(value) => setExpenseFilters((previous) => ({ ...previous, dueIn: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseDueFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Centro de custo</Label>
                <Input
                  placeholder="Ex: Marketing"
                  value={expenseFilters.costCenter}
                  onChange={(event) =>
                    setExpenseFilters((previous) => ({ ...previous, costCenter: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpenseFilters({
                    type: '',
                    status: '',
                    costCenter: '',
                    dueIn: '',
                  })
                }
              >
                Limpar filtros
              </Button>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total em despesas"
              value={formatCurrency(expenseTotals.total, expenseCurrency)}
              loading={isExpensesLoading && !expensesQuery.data}
            />
            <SummaryCard
              title="A pagar"
              value={formatCurrency(expenseTotals.pending, expenseCurrency)}
              loading={isExpensesLoading && !expensesQuery.data}
            />
            <SummaryCard
              title="Atrasadas"
              value={formatCurrency(expenseTotals.overdue, expenseCurrency)}
              loading={isExpensesLoading && !expensesQuery.data}
              badge={expenseTotals.overdue > 0 ? 'Atenção' : undefined}
            />
          </div>

          {expenses.length === 0 && !expensesQuery.isLoading ? (
            <EmptyPlaceholder
              title="Sem despesas registradas"
              description="Cadastre despesas para acompanhar o impacto financeiro e gerar relatórios consolidados."
            >
              <Button variant="ghost" onClick={() => setExpenseDialogOpen(true)}>
                Registrar nova despesa
              </Button>
            </EmptyPlaceholder>
          ) : (
            <ExpensesTable data={expenses} isLoading={expensesQuery.isLoading} isFetching={expensesQuery.isFetching} />
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Tipo</Label>
                <Select
                  value={recurringFilters.type}
                  onValueChange={(value) => setRecurringFilters((previous) => ({ ...previous, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypeFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                <Select
                  value={recurringFilters.status}
                  onValueChange={(value) => setRecurringFilters((previous) => ({ ...previous, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringStatusFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Próximo vencimento</Label>
                <Select
                  value={recurringFilters.dueIn}
                  onValueChange={(value) => setRecurringFilters((previous) => ({ ...previous, dueIn: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringDueFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Centro de custo</Label>
                <Input
                  placeholder="Ex: Operações"
                  value={recurringFilters.costCenter}
                  onChange={(event) =>
                    setRecurringFilters((previous) => ({ ...previous, costCenter: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setRecurringFilters({
                    type: '',
                    status: '',
                    costCenter: '',
                    dueIn: '',
                  })
                }
              >
                Limpar filtros
              </Button>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total recorrente"
              value={formatCurrency(recurringTotals.total, recurringCurrency)}
              loading={isRecurringLoading && !recurringQuery.data}
            />
            <SummaryCard
              title="Ativas"
              value={formatCurrency(recurringTotals.active, recurringCurrency)}
              loading={isRecurringLoading && !recurringQuery.data}
            />
            <SummaryCard
              title="Pausadas"
              value={formatCurrency(recurringTotals.paused, recurringCurrency)}
              loading={isRecurringLoading && !recurringQuery.data}
            />
          </div>

          {recurringExpenses.length === 0 && !recurringQuery.isLoading ? (
            <EmptyPlaceholder
              title="Sem despesas recorrentes"
              description="Automatize custos fixos para prever saídas futuras e manter o fluxo de caixa saudável."
            >
              <Button variant="ghost" onClick={() => setRecurringDialogOpen(true)}>
                Criar despesa recorrente
              </Button>
            </EmptyPlaceholder>
          ) : (
            <RecurringExpensesTable
              data={recurringExpenses}
              isLoading={recurringQuery.isLoading}
              isFetching={recurringQuery.isFetching}
              onGenerate={handleGenerateRecurring}
              generatingId={generatingId}
            />
          )}
        </TabsContent>
      </Tabs>

      <ExpenseFormDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSubmit={handleExpenseSubmit}
        isSubmitting={createExpense.isPending}
      />

      <RecurringExpenseFormDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        onSubmit={handleRecurringSubmit}
        isSubmitting={createRecurringExpense.isPending}
      />
    </div>
  )
}
