'use client'

import * as React from 'react'
import {
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { cn } from '@/lib/utils'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export interface FieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>
  name: TName
  label?: React.ReactNode
  description?: React.ReactNode
  render: (field: ControllerRenderProps<TFieldValues, TName>) => React.ReactNode
  className?: string
  labelProps?: React.ComponentProps<typeof FormLabel>
  descriptionProps?: React.ComponentProps<typeof FormDescription>
  hideMessage?: boolean
}

export function Field<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  render,
  className,
  labelProps,
  descriptionProps,
  hideMessage,
}: FieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-2', className)}>
          {label ? <FormLabel {...labelProps}>{label}</FormLabel> : null}
          <FormControl>{render(field)}</FormControl>
          {description ? (
            <FormDescription {...descriptionProps}>{description}</FormDescription>
          ) : null}
          {hideMessage ? null : <FormMessage />}
        </FormItem>
      )}
    />
  )
}
