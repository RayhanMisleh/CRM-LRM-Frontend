'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import type { KeyboardEvent } from 'react'
import { Loader2, MonitorCog, Moon, Plus, Sun, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { EmptyPlaceholder } from '@/features/layout/empty-placeholder'
import { PageHeader } from '@/features/layout/header/page-header'
import { useClients, useUpdateClientTags } from '@/features/clients/api'
import { updateThemePreference } from '@/app/(app)/settings/actions'
import { toast } from '@/hooks/use-toast'

type ThemePreference = 'light' | 'dark' | 'system'
type TableDensity = 'comfortable' | 'compact'

const densityStorageKey = 'ui:table-density'

export default function SettingsPage() {
  const [tableDensity, setTableDensity] = useState<TableDensity>('comfortable')
  const [themePreference, setThemePreference] = useState<ThemePreference>('system')
  const [isThemePending, startThemeTransition] = useTransition()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [localTags, setLocalTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')

  const clientsQuery = useClients({ pageSize: 100 })
  const clientOptions = useMemo(
    () =>
      clientsQuery.data?.data?.map((client) => ({
        id: client.id,
        label: client.tradeName ?? client.companyName,
      })) ?? [],
    [clientsQuery.data?.data],
  )

  const effectiveClientId = useMemo(() => {
    if (selectedClientId) return selectedClientId
    return clientOptions[0]?.id ?? null
  }, [clientOptions, selectedClientId])

  const selectedClient = useMemo(
    () => clientsQuery.data?.data?.find((client) => client.id === (effectiveClientId ?? '')) ?? null,
    [clientsQuery.data?.data, effectiveClientId],
  )

  const updateClientTags = useUpdateClientTags()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedDensity = window.localStorage.getItem(densityStorageKey)
    if (storedDensity === 'comfortable' || storedDensity === 'compact') {
      setTableDensity(storedDensity)
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const hasDarkClass = document.documentElement.classList.contains('dark')
    if (hasDarkClass) {
      setThemePreference('dark')
    } else if (prefersDark) {
      setThemePreference('system')
    } else {
      setThemePreference('light')
    }
  }, [])

  useEffect(() => {
    if (!selectedClient) return
    setLocalTags(selectedClient.tags ?? [])
  }, [selectedClient])

  const handleDensityChange = useCallback((value: TableDensity) => {
    setTableDensity(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(densityStorageKey, value)
    }
  }, [])

  const applyThemePreference = useCallback((value: ThemePreference) => {
    if (typeof document === 'undefined') return

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const shouldUseDark = value === 'dark' || (value === 'system' && prefersDark)

    document.documentElement.classList.toggle('dark', shouldUseDark)
  }, [])

  const handleThemeChange = useCallback(
    (value: ThemePreference) => {
      setThemePreference(value)
      applyThemePreference(value)
      startThemeTransition(async () => {
        try {
          await updateThemePreference(value)
          toast({
            title: 'Preferência atualizada',
            description: 'O tema da interface foi atualizado.',
          })
        } catch (error) {
          const message =
            (error as { friendlyMessage?: string })?.friendlyMessage ??
            (error as Error)?.message ??
            'Não foi possível atualizar o tema agora.'
          toast({
            title: 'Erro ao atualizar tema',
            description: message,
            variant: 'destructive',
          })
        }
      })
    },
    [applyThemePreference],
  )

  const handleAddTag = useCallback(() => {
    const nextTag = tagDraft.trim()
    if (!nextTag) return

    setLocalTags((prev) => {
      if (prev.includes(nextTag)) return prev
      return [...prev, nextTag]
    })
    setTagDraft('')
  }, [tagDraft])

  const handleRemoveTag = useCallback((tag: string) => {
    setLocalTags((prev) => prev.filter((item) => item !== tag))
  }, [])

  const handlePersistTags = useCallback(async () => {
    if (!effectiveClientId) return

    try {
      await updateClientTags.mutateAsync({ id: effectiveClientId, tags: localTags })
      toast({
        title: 'Tags atualizadas',
        description: 'As tags do cliente foram atualizadas com sucesso.',
      })
    } catch (error) {
      const message =
        (error as { friendlyMessage?: string })?.friendlyMessage ??
        (error as Error)?.message ??
        'Não foi possível atualizar as tags.'
      toast({
        title: 'Erro ao atualizar tags',
        description: message,
        variant: 'destructive',
      })
    }
  }, [effectiveClientId, localTags, updateClientTags])

  const handleTagInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Personalize preferências visuais e mantenha a taxonomia de clientes organizada."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Configurações' }]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">Preferências de UI</CardTitle>
            <CardDescription>
              Ajuste como a interface se comporta para o seu usuário, com densidade de dados e aparência do tema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Densidade de tabelas</p>
              <RadioGroup value={tableDensity} onValueChange={(value) => handleDensityChange(value as TableDensity)}>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <RadioGroupItem value="comfortable" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Confortável</p>
                    <p className="text-xs text-muted-foreground">
                      Mais espaçamento para leitura em relatórios detalhados.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <RadioGroupItem value="compact" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Compacto</p>
                    <p className="text-xs text-muted-foreground">
                      Aproveite melhor telas menores com células mais enxutas.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <Separator className="border-white/10" />

            <div className="space-y-3">
              <p className="text-sm font-medium">Tema da aplicação</p>
              <RadioGroup value={themePreference} onValueChange={(value) => handleThemeChange(value as ThemePreference)}>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <RadioGroupItem value="light" />
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sun className="size-4" /> Claro
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <RadioGroupItem value="dark" />
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Moon className="size-4" /> Escuro
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <RadioGroupItem value="system" />
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MonitorCog className="size-4" />
                    Sistema
                  </div>
                </label>
              </RadioGroup>
              {isThemePending && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Salvando preferência...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">Tags de Cliente</CardTitle>
            <CardDescription>
              Organize segmentações rápidas para filtrar contatos e distribuir carteiras de atendimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {clientsQuery.isLoading ? (
              <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-white/80">
                <Loader2 className="size-4 animate-spin" /> Carregando clientes...
              </div>
            ) : clientOptions.length === 0 ? (
              <EmptyPlaceholder
                title="Nenhum cliente disponível"
                description="Cadastre clientes para começar a organizar tags personalizadas."
              >
                <Button className="rounded-full" disabled>
                  Sem clientes
                </Button>
              </EmptyPlaceholder>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80" htmlFor="client-selector">
                    Cliente para edição
                  </label>
                  <Select value={effectiveClientId ?? ''} onValueChange={(value) => setSelectedClientId(value)}>
                    <SelectTrigger id="client-selector">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Nova tag"
                    className="w-48"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag}>
                    <Plus className="mr-2 size-4" /> Adicionar tag
                  </Button>
                </div>

                <div className="min-h-[3rem] rounded-xl border border-white/10 bg-white/5 p-3">
                  {localTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada para este cliente.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {localTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-2 rounded-full bg-white/10 text-white">
                          <span>{tag}</span>
                          <button
                            type="button"
                            className="rounded-full bg-white/10 p-1 hover:bg-white/20"
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`Remover tag ${tag}`}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handlePersistTags} disabled={updateClientTags.isPending}>
                    {updateClientTags.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Aplicar tags'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
