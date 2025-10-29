import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Despesas"
        description="Monitore custos operacionais, lançamentos recorrentes e aprovação de despesas."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Despesas' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Registrar despesa
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Sem despesas registradas"
        description="Cadastre despesas para acompanhar o impacto financeiro e gerar relatórios consolidados."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Importar lançamentos
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Adicionar despesa
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
