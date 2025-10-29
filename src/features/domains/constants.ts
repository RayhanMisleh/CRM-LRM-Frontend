export const DOMAIN_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'expiring', label: 'Expirando' },
  { value: 'expired', label: 'Expirado' },
]

export const DOMAIN_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos os status' },
  ...DOMAIN_STATUS_OPTIONS,
]

export const DOMAIN_PROVIDER_OPTIONS = [
  { value: 'registrobr', label: 'Registro.br' },
  { value: 'godaddy', label: 'GoDaddy' },
  { value: 'hostgator', label: 'HostGator' },
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'namecheap', label: 'Namecheap' },
]

export const DOMAIN_REMINDER_OPTIONS = [
  { value: 7, label: '7 dias antes' },
  { value: 15, label: '15 dias antes' },
  { value: 30, label: '30 dias antes' },
]

export const DOMAIN_DUE_FILTER_OPTIONS = [
  { value: '', label: 'Todos os prazos' },
  { value: '7', label: 'Expiram em 7 dias' },
  { value: '15', label: 'Expiram em 15 dias' },
  { value: '30', label: 'Expiram em 30 dias' },
]
