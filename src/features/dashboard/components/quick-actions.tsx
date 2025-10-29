'use client'

import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface QuickActionItem {
  label: string
  description?: string
  icon: LucideIcon
  href: string
}

export interface QuickActionsProps {
  title?: string
  actions: QuickActionItem[]
  isLoading?: boolean
}

export function QuickActions({ title = 'Ações rápidas', actions, isLoading = false }: QuickActionsProps) {
  const router = useRouter()

  return (
    <Card className="flex h-full flex-col rounded-3xl border border-white/15 bg-white/10 p-6 text-white">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/60">Acelere fluxos importantes com um clique.</p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl bg-white/15" />
            ))
          : actions.map((action) => (
              <Button
                key={action.href}
                variant="ghost"
                className="group flex h-full flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-white/80 transition hover:border-white/20 hover:bg-white/10"
                onClick={() => router.push(action.href)}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="h-5 w-5 text-white" aria-hidden />
                  <span className="text-sm font-semibold text-white">{action.label}</span>
                </div>
                <div className="flex w-full items-center justify-between text-xs text-white/60">
                  <span>{action.description}</span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden />
                </div>
              </Button>
            ))}
      </div>
    </Card>
  )
}
