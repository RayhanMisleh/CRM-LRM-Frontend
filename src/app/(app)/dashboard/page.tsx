import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { DashboardOverview } from '@/features/dashboard/dashboard-overview'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Acompanhe a performance de vendas, relacionamento e atividades do time em tempo real."
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Compartilhar relatório
          </Button>
        }
      />
      <DashboardOverview />
    </div>
  )
}
