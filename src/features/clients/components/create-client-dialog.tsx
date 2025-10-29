'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

import { useCreateClient } from '../api'
import { ClientForm, clientFormSchema, mapFormValuesToPayload, type ClientFormValues } from './client-form'

const emptyValues: ClientFormValues = {
  companyName: '',
  tradeName: '',
  cnpj: '',
  email: '',
  phone: '',
  status: 'active',
  segment: '',
  tags: '',
  notes: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  responsibleRole: '',
}

interface CreateClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyValues,
  })
  const createClient = useCreateClient()

  useEffect(() => {
    if (!open) {
      form.reset(emptyValues)
    }
  }, [form, open])

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      await createClient.mutateAsync(mapFormValuesToPayload(values))
      toast({
        title: 'Cliente criado',
        description: 'O cliente foi cadastrado com sucesso.',
      })
      onOpenChange(false)
      form.reset(emptyValues)
    } catch (error) {
      const message =
        (error as Error)?.message ?? 'Não foi possível criar o cliente. Tente novamente.'
      toast({
        title: 'Erro ao criar cliente',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados para cadastrar um novo cliente no CRM.
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          form={form}
          onSubmit={handleSubmit}
          submitLabel="Criar cliente"
          isSubmitting={createClient.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
