import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { Sidebar } from '@/features/layout/sidebar'
import { Topbar } from '@/features/layout/topbar'
import { LayoutBackground } from '@/features/layout/layout-background'
import { LayoutLoading } from '@/features/layout/layout-loading'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <LayoutBackground />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6" role="main">
            <Suspense fallback={<LayoutLoading />}>{children}</Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
