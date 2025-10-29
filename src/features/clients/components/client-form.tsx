'use client'

import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cleanCnpj, isValidCnpj } from '@/lib/validators'

import { CLIENT_STATUS_OPTIONS } from '../constants'
import type { CreateClientInput, UpdateClientInput } from '../api'
import type { UseFormReturn } from 'react-hook-form'

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  })
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'E-mail inválido',
  })

export const clientFormSchema = z.object({
  companyName: z.string().min(2, 'Informe a razão social'),
  tradeName: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  cnpj: z
    .string()
    .trim()
    .min(1, 'Informe o CNPJ')
    .refine((value) => isValidCnpj(value), 'CNPJ inválido')
    .transform((value) => cleanCnpj(value)),
  email: optionalEmailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: z.string().min(1, 'Selecione um status'),
  segment: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : '')),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  responsibleName: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  responsibleEmail: optionalEmailSchema,
  responsiblePhone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  responsibleRole: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

export const mapFormValuesToPayload = (
  values: ClientFormValues,
): Omit<CreateClientInput, 'responsible'> & {
  responsible?: CreateClientInput['responsible']
} => {
  const tagsArray = values.tags
    ? values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : undefined

  const responsibleFields = {
    name: values.responsibleName,
    email: values.responsibleEmail,
    phone: values.responsiblePhone,
    role: values.responsibleRole,
  }

  const hasResponsible = Object.values(responsibleFields).some((field) => field && field.length > 0)

  return {
    companyName: values.companyName.trim(),
    tradeName: values.tradeName,
    cnpj: values.cnpj,
    email: values.email,
    phone: values.phone,
    status: values.status,
    segment: values.segment,
    tags: tagsArray,
    notes: values.notes,
    responsible: hasResponsible ? responsibleFields : undefined,
  }
}

interface ClientFormProps {
  form: UseFormReturn<ClientFormValues>
  onSubmit: (values: ClientFormValues) => void | Promise<void>
  submitLabel: string
  isSubmitting?: boolean
}

export function ClientForm({ form, onSubmit, submitLabel, isSubmitting }: ClientFormProps) {
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razão social</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Empresa Exemplo LTDA" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tradeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome fantasia</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Marca conhecida" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="00.000.000/0000-00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="contato@empresa.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="(11) 99999-9999" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CLIENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="segment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segmento</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Tecnologia" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="vip, marketing" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anotações</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Observações relevantes sobre o cliente"
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="responsibleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Nome da pessoa de contato" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="responsibleRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Diretor de TI" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="responsibleEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail do responsável</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="responsavel@empresa.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="responsiblePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone do responsável</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="(11) 98888-7777" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export type ClientPayload = ReturnType<typeof mapFormValuesToPayload>

export const mapFormValuesToUpdatePayload = (
  id: string,
  values: ClientFormValues,
): UpdateClientInput => ({
  id,
  ...mapFormValuesToPayload(values),
})
