'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon, XIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy'

type DatePickerMode = 'single' | 'range'

type DatePickerValue<TMode extends DatePickerMode> = TMode extends 'range'
  ? DateRange | undefined
  : Date | null | undefined

export interface DatePickerProps<TMode extends DatePickerMode = 'single'>
  extends Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'> {
  mode?: TMode
  value?: DatePickerValue<TMode>
  defaultValue?: DatePickerValue<TMode>
  onChange?: (value: DatePickerValue<TMode>) => void
  placeholder?: string
  formatString?: string
  clearable?: boolean
  disabled?: boolean
  triggerProps?: ButtonProps
  triggerClassName?: string
  popoverContentProps?: React.ComponentProps<typeof PopoverContent>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DatePicker<TMode extends DatePickerMode = 'single'>({
  mode = 'single' as TMode,
  value,
  defaultValue,
  onChange,
  placeholder = 'Selecione uma data',
  formatString = DEFAULT_DATE_FORMAT,
  clearable,
  disabled,
  triggerProps,
  triggerClassName,
  popoverContentProps,
  open: openProp,
  onOpenChange,
  ...calendarProps
}: DatePickerProps<TMode>) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState<DatePickerValue<TMode> | undefined>(
    defaultValue,
  )
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)

  const currentValue = (isControlled ? value : internalValue) as DatePickerValue<TMode>
  const hasValue = React.useMemo(() => {
    if (mode === 'range') {
      const range = currentValue as DateRange | undefined
      return !!(range?.from || range?.to)
    }

    return !!currentValue
  }, [currentValue, mode])

  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(next)
      }

      onOpenChange?.(next)
    },
    [onOpenChange, openProp],
  )

  const setValue = React.useCallback(
    (nextValue: DatePickerValue<TMode>) => {
      if (!isControlled) {
        setInternalValue(nextValue)
      }

      onChange?.(nextValue)
    },
    [isControlled, onChange],
  )

  const handleSelect = React.useCallback(
    (nextValue: Date | DateRange | undefined) => {
      if (mode === 'range') {
        const rangeValue = nextValue as DateRange | undefined
        setValue(rangeValue as DatePickerValue<TMode>)

        if (rangeValue?.from && rangeValue?.to) {
          setOpen(false)
        }

        return
      }

      const singleValue = (nextValue as Date | undefined) ?? null
      setValue(singleValue as DatePickerValue<TMode>)
      setOpen(false)
    },
    [mode, setOpen, setValue],
  )

  const handleClear = React.useCallback(() => {
    if (mode === 'range') {
      setValue(undefined as DatePickerValue<TMode>)
    } else {
      setValue(null as DatePickerValue<TMode>)
    }
  }, [mode, setValue])

  const displayLabel = React.useMemo(() => {
    if (!hasValue) {
      return placeholder
    }

    if (mode === 'range') {
      const range = currentValue as DateRange | undefined
      if (range?.from && range?.to) {
        return `${format(range.from, formatString)} - ${format(range.to, formatString)}`
      }

      if (range?.from) {
        return format(range.from, formatString)
      }

      return placeholder
    }

    return currentValue ? format(currentValue as Date, formatString) : placeholder
  }, [currentValue, formatString, hasValue, mode, placeholder])

  const calendarSelected = React.useMemo(() => {
    if (mode === 'range') {
      return (currentValue as DateRange | undefined) ?? undefined
    }

    const single = currentValue as Date | null | undefined
    return single ?? undefined
  }, [currentValue, mode])

  const {
    className: triggerClassNameOverride,
    disabled: triggerDisabled,
    ...restTriggerProps
  } = triggerProps ?? {}
  const isDisabled = disabled ?? triggerDisabled ?? false
  const finalTriggerProps = {
    variant: 'outline' as ButtonProps['variant'],
    className: cn(
      'justify-start text-left font-normal',
      !hasValue && 'text-muted-foreground',
      triggerClassName,
      triggerClassNameOverride,
    ),
    disabled: isDisabled,
    ...restTriggerProps,
  }

  const { disabled: calendarDisabled, ...restCalendarProps } = calendarProps

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            {...finalTriggerProps}
          >
            <CalendarIcon className="mr-2 size-4" />
            <span>{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" {...popoverContentProps}>
          <Calendar
            mode={mode}
            selected={calendarSelected as never}
            onSelect={handleSelect as never}
            disabled={calendarDisabled}
            {...restCalendarProps}
          />
        </PopoverContent>
      </Popover>
      {clearable && hasValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={handleClear}
          disabled={isDisabled}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Limpar data selecionada</span>
        </Button>
      ) : null}
    </div>
  )
}
