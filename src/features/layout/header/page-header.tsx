import type { ReactNode } from 'react'

import { HeaderBreadcrumbs, type HeaderBreadcrumb } from '@/features/layout/header/header-breadcrumbs'

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: HeaderBreadcrumb[]
  actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {breadcrumbs?.length ? <HeaderBreadcrumbs items={breadcrumbs} /> : null}
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">{title}</h2>
            {description ? <p className="text-sm text-white/70">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
