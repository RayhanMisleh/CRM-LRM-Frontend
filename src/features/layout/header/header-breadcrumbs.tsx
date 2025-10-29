import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface HeaderBreadcrumb {
  href?: string
  label: string
}

interface HeaderBreadcrumbsProps {
  items: HeaderBreadcrumb[]
}

export function HeaderBreadcrumbs({ items }: HeaderBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
      <Link href="/dashboard" className="flex items-center gap-1 text-white/70 transition hover:text-white">
        <Home className="h-3.5 w-3.5" aria-hidden />
        Início
      </Link>
      {items.map((item) => (
        <span key={`${item.href ?? item.label}`} className="flex items-center gap-2">
          <ChevronRight className="h-3 w-3 text-white/40" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="text-white/70 transition hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-white">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
