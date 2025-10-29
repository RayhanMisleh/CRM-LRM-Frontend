import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Personalize integrações, permissões e preferências de comunicação da organização."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Configurações' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Editar perfil
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Configure seu ambiente"
        description="Defina integrações com sistemas financeiros, notificações e preferências de branding."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Ver integrações
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Configurar workspace
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
