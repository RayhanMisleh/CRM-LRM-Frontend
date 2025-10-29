import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SearchCommand } from '@/features/layout/search-command'
import { QuickCreateMenu } from '@/features/layout/quick-create-menu'

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-slate-900/60 px-6 py-4 text-white backdrop-blur-xl">
      <div className="hidden text-left lg:block">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">LRM CRM Suite</p>
        <h1 className="text-lg font-semibold text-white">Experiência conectada com seus clientes</h1>
      </div>
      <div className="flex flex-1 items-center gap-4">
        <SearchCommand />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-2xl border border-transparent text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Abrir notificações"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </Button>
        <QuickCreateMenu />
      </div>
    </header>
  )
}
