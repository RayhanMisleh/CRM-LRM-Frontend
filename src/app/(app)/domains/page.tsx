import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function DomainsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Domínios"
        description="Controle renovações de domínios e status de DNS para projetos hospedados pela equipe."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Domínios' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Adicionar domínio
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Nenhum domínio cadastrado"
        description="Integre seus domínios para monitorar validade, provedores e responsáveis."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Importar lista
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Adicionar domínio
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
