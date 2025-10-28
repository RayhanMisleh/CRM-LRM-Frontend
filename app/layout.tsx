import type React from 'react'
import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'

import { Providers } from '@/app/providers'

import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'LRM Solutions - CRM',
  description: 'Sistema de gerenciamento de relacionamento com clientes LRM Solutions',
  icons: {
    icon: '/favico.svg',
    shortcut: '/favico.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} antialiased`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
