import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        description="Gerencie assinaturas recorrentes, métricas de churn e planos ativos em um só lugar."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Assinaturas' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Nova assinatura
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Nenhuma assinatura ativa"
        description="Cadastre clientes em planos recorrentes para visualizar ciclo de cobrança e renovações."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Ver planos
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Configurar assinatura
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
