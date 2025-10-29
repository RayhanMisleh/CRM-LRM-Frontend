'use client'

import type { LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface DashboardKpiProps {
  title: string
  value?: string
  helperText?: string
  trend?: {
    label: string
    variant?: 'positive' | 'negative' | 'neutral'
  }
  icon?: LucideIcon
  onClick?: () => void
  isLoading?: boolean
}

const trendStyles: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
  neutral: 'text-white/70',
}

export function DashboardKpi({
  title,
  value,
  helperText,
  trend,
  icon: Icon,
  onClick,
  isLoading = false,
}: DashboardKpiProps) {
  const clickable = typeof onClick === 'function'

  return (
    <Card
      role={clickable ? 'button' : 'figure'}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!clickable) return

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-6 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        clickable ? 'cursor-pointer hover:border-white/40 hover:bg-white/15' : 'hover:border-white/30 hover:bg-white/15',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-white/70">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24 rounded-full bg-white/20" />
          ) : (
            <p className="text-2xl font-semibold text-white">{value ?? '—'}</p>
          )}
          {helperText ? (
            <p className="text-xs text-white/60">{helperText}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-white/80">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        {isLoading ? (
          <Skeleton className="h-4 w-20 rounded-full bg-white/15" />
        ) : trend ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full border border-white/15 px-2 py-1 text-xs font-medium uppercase tracking-wide',
              trendStyles[trend.variant ?? 'neutral'],
            )}
          >
            {trend.label}
          </span>
        ) : null}
        {clickable ? (
          <span className="text-xs font-medium text-white/70 transition group-hover:text-white/90">Ver detalhes →</span>
        ) : null}
      </div>
    </Card>
  )
}
