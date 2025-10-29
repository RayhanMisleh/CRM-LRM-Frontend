import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { QuickCreateMenu } from '@/features/layout/quick-create-menu'

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-end gap-4 border-b border-white/10 bg-slate-900/60 px-6 py-4 text-white backdrop-blur-xl">
      {/* Left title removed to keep header minimal and aligned to the right */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-transparent text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Abrir notificações"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </Button>
        <QuickCreateMenu />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/10 bg-transparent p-0 text-white/80 shadow-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Abrir menu do perfil"
            >
              <Avatar className="h-9 w-9 border border-white/10">
                <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">LR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-2xl border-white/10 bg-slate-950/90 text-white backdrop-blur-xl"
          >
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-white/50">
              Sua conta
            </DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer rounded-xl text-sm text-white/80 focus:bg-white/10 focus:text-white">
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer rounded-xl text-sm text-rose-400 focus:bg-rose-500/20 focus:text-rose-200">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
