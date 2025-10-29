export const INVOICE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Em atraso' },
  { value: 'paid', label: 'Paga' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'draft', label: 'Rascunho' },
]

export const INVOICE_DUE_OPTIONS = [
  { value: '', label: 'Todos os vencimentos' },
  { value: '7', label: 'Vencem em 7 dias' },
  { value: '15', label: 'Vencem em 15 dias' },
  { value: '30', label: 'Vencem em 30 dias' },
  { value: '90', label: 'Vencem em 90 dias' },
]

export const INVOICE_PERIOD_OPTIONS = [
  { value: '', label: 'Todo o período' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
]
