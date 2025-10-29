import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/layout/header/page-header'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reuniões"
        description="Controle agendas, notas e follow-ups para garantir engajamento com clientes e leads."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Reuniões' }]}
        actions={
          <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
            Agendar reunião
          </Button>
        }
      />

      <EmptyPlaceholder
        title="Nenhuma reunião agendada"
        description="Quando você sincronizar calendários ou criar reuniões elas aparecerão neste painel."
      >
        <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
          Conectar calendário
        </Button>
        <Button className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25">
          Agendar reunião
        </Button>
      </EmptyPlaceholder>
    </div>
  )
}
