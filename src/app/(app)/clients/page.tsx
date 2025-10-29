'use client'

import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { CreateClientDialog } from '@/features/clients/components/create-client-dialog'
import { ClientsTable } from '@/features/clients/components/clients-table'
import { EditClientDialog } from '@/features/clients/components/edit-client-dialog'
import type { Client } from '@/features/clients/api'
import { PageHeader } from '@/features/layout/header/page-header'

export default function ClientsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const openCreateDialog = useCallback(() => setIsCreateOpen(true), [])

  const handleEditClient = useCallback((client: Client) => {
    setSelectedClient(client)
    setIsEditOpen(true)
  }, [])

  const handleEditOpenChange = useCallback((open: boolean) => {
    setIsEditOpen(open)
    if (!open) {
      setSelectedClient(null)
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Organize o pipeline de relacionamento e acompanhe informações essenciais de cada conta."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Clientes' }]}
        actions={
          <Button
            onClick={openCreateDialog}
            className="rounded-2xl border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
          >
            Adicionar cliente
          </Button>
        }
      />

      <ClientsTable onCreateClient={openCreateDialog} onEditClient={handleEditClient} />

      <CreateClientDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <EditClientDialog
        open={isEditOpen}
        onOpenChange={handleEditOpenChange}
        client={selectedClient ?? undefined}
      />
    </div>
  )
}
