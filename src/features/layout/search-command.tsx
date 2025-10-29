import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

export function SearchCommand() {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
      <Input
        type="search"
        name="global-search"
        placeholder="Busque por contatos, contratos ou atividades..."
        className="w-full rounded-2xl border border-white/20 bg-white/10 pl-10 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15"
        aria-label="Buscar no CRM"
      />
    </div>
  )
}
