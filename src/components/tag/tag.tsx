'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const tagVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-foreground shadow-sm transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-border/60 bg-muted text-muted-foreground dark:border-border/40 dark:bg-muted/40 dark:text-muted-foreground',
        outline: 'border-border bg-transparent text-foreground',
        success:
          'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
        warning:
          'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
        danger:
          'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-[0.7rem]',
        md: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  onRemove?: (event: React.MouseEvent<HTMLButtonElement>) => void
  removeLabel?: string
  leadingIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  disabled?: boolean
}

export function Tag({
  variant,
  size,
  onRemove,
  removeLabel = 'Remover',
  leadingIcon: LeadingIcon,
  disabled,
  className,
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(tagVariants({ variant, size }), className)}
      {...props}
    >
      {LeadingIcon ? <LeadingIcon className="size-3" aria-hidden /> : null}
      <span className="truncate leading-none">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-full transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/15',
          )}
          onClick={onRemove}
          aria-label={removeLabel}
          disabled={disabled}
        >
          <XIcon className="size-3" aria-hidden />
        </button>
      ) : null}
    </span>
  )
}
