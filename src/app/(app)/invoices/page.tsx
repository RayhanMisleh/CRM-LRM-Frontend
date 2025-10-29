import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturas"
        description="Acompanhe emissões, recebimentos e previsões de faturamento para manter o fluxo de caixa saudável."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Faturas' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Nova fatura
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Sem faturas emitidas"
        description="Crie sua primeira fatura para acompanhar o status de pagamento diretamente pelo CRM."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Importar faturas
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Emitir fatura
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
