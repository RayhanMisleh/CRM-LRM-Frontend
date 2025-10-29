'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase',
  {
    variants: {
      tone: {
        neutral:
          'border-border/60 bg-muted text-muted-foreground dark:border-border/40 dark:bg-muted/40 dark:text-muted-foreground',
        info: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
        success:
          'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
        warning:
          'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
        danger:
          'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
        offline:
          'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
      },
      subtle: {
        true: 'uppercase tracking-normal font-medium px-2.5 py-0.5 text-[0.7rem] gap-1',
        false: '',
      },
      withDot: {
        true: 'pl-2.5',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      subtle: false,
      withDot: false,
    },
  },
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: React.ReactNode
  leadingIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  showDot?: boolean
}

export function StatusBadge({
  tone,
  subtle,
  withDot,
  label,
  leadingIcon: LeadingIcon,
  showDot,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const shouldShowDot = showDot ?? withDot ?? false

  return (
    <span
      className={cn(statusBadgeVariants({ tone, subtle, withDot: shouldShowDot }), className)}
      {...props}
    >
      {shouldShowDot ? (
        <span className="inline-flex size-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {LeadingIcon ? <LeadingIcon className="size-3" aria-hidden /> : null}
      <span className="whitespace-nowrap">
        {children ?? label}
      </span>
    </span>
  )
}
