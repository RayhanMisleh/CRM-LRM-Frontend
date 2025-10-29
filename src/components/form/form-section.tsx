'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface FormSectionProps {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function FormSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-6 rounded-lg border bg-card p-6 shadow-sm',
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            {title ? (
              <h3 className="text-lg font-semibold leading-none text-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className={cn('grid gap-4', contentClassName)}>{children}</div>
    </section>
  )
}
