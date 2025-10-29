import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Organize o pipeline de relacionamento e acompanhe informações essenciais de cada conta."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Clientes' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Adicionar cliente
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Nenhum cliente cadastrado ainda"
        description="Importe uma planilha ou crie manualmente seus primeiros clientes para iniciar os acompanhamentos."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Importar planilha
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Criar cliente
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
