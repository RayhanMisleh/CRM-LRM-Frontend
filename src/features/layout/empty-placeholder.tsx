import type { ReactNode } from 'react'
import { CircleDashed } from 'lucide-react'

export interface EmptyPlaceholderProps {
  title: string
  description?: string
  icon?: ReactNode
  children?: ReactNode
}

export function EmptyPlaceholder({ title, description, icon, children }: EmptyPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/80">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
        {icon ?? <CircleDashed className="h-8 w-8" aria-hidden />}
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-white/70">{description}</p> : null}
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  )
}
