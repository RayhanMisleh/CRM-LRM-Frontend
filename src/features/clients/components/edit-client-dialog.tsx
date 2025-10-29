'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/hooks/use-toast'

import { useUpdateClient, type Client } from '../api'
import {
  ClientForm,
  clientFormSchema,
  mapFormValuesToUpdatePayload,
  type ClientFormValues,
} from './client-form'

interface EditClientDialogProps {
  open: boolean
  client?: Client | null
  onOpenChange: (open: boolean) => void
}

const buildDefaultValues = (client?: Client | null): ClientFormValues => ({
  companyName: client?.companyName ?? '',
  tradeName: client?.tradeName ?? '',
  cnpj: client?.cnpj ?? '',
  email: client?.email ?? '',
  phone: client?.phone ?? '',
  status: client?.status ?? 'active',
  segment: client?.segment ?? '',
  tags: client?.tags?.join(', ') ?? '',
  notes: client?.notes ?? '',
  responsibleName: client?.responsible?.name ?? '',
  responsibleEmail: client?.responsible?.email ?? '',
  responsiblePhone: client?.responsible?.phone ?? '',
  responsibleRole: client?.responsible?.role ?? '',
})

export function EditClientDialog({ open, client, onOpenChange }: EditClientDialogProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: buildDefaultValues(client),
  })
  const updateClient = useUpdateClient()

  useEffect(() => {
    if (open && client) {
      form.reset(buildDefaultValues(client))
    }
  }, [client, form, open])

  useEffect(() => {
    if (!open) {
      form.reset(buildDefaultValues(client))
    }
  }, [client, form, open])

  const handleSubmit = async (values: ClientFormValues) => {
    if (!client) return

    try {
      await updateClient.mutateAsync(mapFormValuesToUpdatePayload(client.id, values))
      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram salvas com sucesso.',
      })
      onOpenChange(false)
    } catch (error) {
      const message =
        (error as Error)?.message ?? 'Não foi possível atualizar o cliente. Tente novamente.'
      toast({
        title: 'Erro ao atualizar cliente',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const isLoadingClient = open && !client

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>Atualize os dados do cliente selecionado.</DialogDescription>
        </DialogHeader>
        {isLoadingClient ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Spinner className="mr-2" /> Carregando cliente...
          </div>
        ) : client ? (
          <ClientForm
            form={form}
            onSubmit={handleSubmit}
            submitLabel="Salvar alterações"
            isSubmitting={updateClient.isPending}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            Nenhum cliente selecionado para edição.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
