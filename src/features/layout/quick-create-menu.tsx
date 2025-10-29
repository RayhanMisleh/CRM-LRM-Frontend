'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Plus, UserPlus, FileSignature, CalendarPlus, FileText, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const quickLinks = [
  { href: '/clients/new', label: 'Novo cliente', icon: UserPlus },
  { href: '/contracts/new', label: 'Novo contrato', icon: FileSignature },
  { href: '/meetings/new', label: 'Agendar reunião', icon: CalendarPlus },
  { href: '/invoices?create=manual', label: 'Emitir fatura', icon: FileText },
] as const

const secondaryLinks = [
  { href: '/tasks/new', label: 'Criar atividade', icon: MessageSquare },
] as const

export function QuickCreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:border-white/25 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Criar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-white/60">Ações rápidas</DropdownMenuLabel>
        {quickLinks.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="cursor-pointer rounded-xl text-sm text-white/80 focus:text-white">
            <Link href={link.href} className="flex items-center gap-3">
              <link.icon className="h-4 w-4" aria-hidden />
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {secondaryLinks.length > 0 ? (
          <Fragment>
            <DropdownMenuSeparator className="bg-white/10" />
            {secondaryLinks.map((link) => (
              <DropdownMenuItem
                key={link.href}
                asChild
                className="cursor-pointer rounded-xl text-sm text-white/70 focus:text-white"
              >
                <Link href={link.href} className="flex items-center gap-3">
                  <link.icon className="h-4 w-4" aria-hidden />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </Fragment>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
