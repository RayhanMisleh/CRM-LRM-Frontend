import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        description="Centralize contratos ativos, renovações pendentes e status de assinatura dos clientes."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Contratos' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Gerar contrato
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Sem contratos registrados"
        description="Assim que gerar contratos com clientes eles aparecerão aqui para acompanhamento."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Modelos disponíveis
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Gerar novo contrato
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
