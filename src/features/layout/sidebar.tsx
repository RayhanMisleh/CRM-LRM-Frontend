"use client"

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Boxes,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * TODO(Oportunidades): assim que o módulo de oportunidades estiver disponível,
 * adicionar novamente o item de menu para `/opportunities` neste array e
 * apontar a rota correspondente em `src/app`. O comentário serve como guia de
 * entrada para quem for ativar o fluxo (ver README em "TODOs rastreados").
 */
const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/contracts', label: 'Contratos', icon: FileText },
  { href: '/service-templates', label: 'Catálogo de Serviços', icon: Boxes },
  { href: '/client-services', label: 'Serviços dos Clientes', icon: Briefcase },
  { href: '/service-billings', label: 'Cobranças', icon: Receipt },
  { href: '/invoices', label: 'Faturas', icon: DollarSign },
  { href: '/domains', label: 'Domínios', icon: Briefcase },
  { href: '/expenses', label: 'Despesas', icon: Bell },
  { href: '/meetings', label: 'Reuniões', icon: Calendar },
  { href: '/settings', label: 'Configurações', icon: Settings },
] satisfies {
  href: string
  label: string
  icon: LucideIcon
}[]

export function Sidebar() {
  const pathname = usePathname()
  const activeSegment = useMemo(() => pathname?.split('?')[0], [pathname])

  return (
    <aside
      className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-8 overflow-y-auto border-r border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl lg:flex"
      aria-label="Navegação principal"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center">
            <Image
              src="/LRM_logo.webp"
              alt="LRM Software Solutions"
              width={136}
              height={40}
              priority
              className="h-12 w-auto"
            />
          </div>
          <p className="text-sm text-white/60">Customer Management</p>
        </div>

        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = activeSegment === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-2xl border border-transparent px-4 py-3 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                  'hover:border-white/20 hover:bg-white/10 hover:text-white',
                  isActive ? 'border-white/20 bg-white/20 text-white shadow-lg' : 'text-white/70'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="mr-3 h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
