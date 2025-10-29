'use client'

import { useState } from 'react'
import {
  Bell,
  Calendar,
  Download,
  Filter,
  LogOut,
  Mail,
  Phone,
  Plus,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Briefcase,
  MessageSquare,
  HelpCircle,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const statsCards = [
  { title: 'Total de contatos', value: '2.847', change: '+12%', icon: Users, color: 'text-blue-400' },
  { title: 'Oportunidades ativas', value: '156', change: '+8%', icon: TrendingUp, color: 'text-green-400' },
  { title: 'Receita acumulada', value: 'R$ 89,2K', change: '+23%', icon: DollarSign, color: 'text-yellow-400' },
  { title: 'Reuniões agendadas', value: '24', change: '+5%', icon: Calendar, color: 'text-purple-400' },
] as const

const recentContacts = [
  {
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    phone: '+55 (11) 91234-5678',
    company: 'TechCorp Inc.',
    status: 'Ativo',
    value: 'R$ 12,5K',
    avatar: 'SJ',
  },
  {
    name: 'Michael Chen',
    email: 'michael@startup.io',
    phone: '+55 (21) 99876-5432',
    company: 'StartupHub',
    status: 'Prospecção',
    value: 'R$ 8,2K',
    avatar: 'MC',
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily@agency.com',
    phone: '+55 (31) 94567-8901',
    company: 'Creative Agency',
    status: 'Ativo',
    value: 'R$ 15,7K',
    avatar: 'ER',
  },
] as const

const quickActions = [
  { icon: Phone, label: 'Agendar ligação' },
  { icon: Mail, label: 'Enviar e-mail' },
  { icon: Calendar, label: 'Marcar reunião' },
  { icon: Plus, label: 'Adicionar nota' },
] as const

const recentActivity = [
  { action: 'Novo contato adicionado', time: 'Há 2 minutos', type: 'success' },
  { action: 'Negócio fechado', time: 'Há 1 hora', type: 'success' },
  { action: 'Reunião agendada', time: 'Há 3 horas', type: 'info' },
  { action: 'E-mail enviado', time: 'Há 5 horas', type: 'default' },
] as const

const productivityShortcuts = [
  { icon: FileText, label: 'Relatórios' },
  { icon: Briefcase, label: 'Negócios' },
  { icon: MessageSquare, label: 'Mensagens' },
  { icon: Target, label: 'Campanhas' },
] as const

export function DashboardOverview() {
  const [selectedContact, setSelectedContact] = useState<(typeof recentContacts)[number] | null>(recentContacts[0])

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat) => (
            <Card
              key={stat.title}
              className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white transition hover:border-white/30 hover:bg-white/15"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/60">{stat.title}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                  <p className={`text-sm ${stat.color}`}>{stat.change}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} aria-hidden />
              </div>
            </Card>
          ))}
        </div>

        <Card className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Contatos recentes 👥</h3>
              <p className="text-sm text-white/60">Atividades e interações acompanhadas pelo time</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
                <Filter className="mr-2 h-4 w-4" aria-hidden />
                Filtrar
              </Button>
              <Button size="sm" variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Exportar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {recentContacts.map((contact) => {
              const isActive = selectedContact?.email === contact.email
              return (
                <button
                  key={contact.email}
                  onClick={() => setSelectedContact(contact)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-pressed={isActive}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-white/20 text-sm font-medium text-white">{contact.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{contact.name}</p>
                          <p className="text-xs text-white/60">
                            {contact.company} • {contact.phone}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{contact.value}</p>
                          <Badge
                            variant={isActive ? 'default' : 'secondary'}
                            className={
                              isActive
                                ? 'border-green-400/30 bg-green-500/20 text-green-300'
                                : 'border-blue-400/30 bg-blue-500/20 text-blue-200'
                            }
                          >
                            {contact.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      </section>

      <aside className="lg:col-span-4 space-y-6">
        <Card className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white">
          <h3 className="mb-4 text-lg font-semibold">Atalhos de produtividade ⚡</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {productivityShortcuts.map((shortcut) => (
              <Button
                key={shortcut.label}
                variant="ghost"
                className="justify-start rounded-2xl border border-transparent text-left text-white/80 transition hover:border-white/20 hover:bg-white/10"
              >
                <shortcut.icon className="mr-3 h-4 w-4" aria-hidden />
                {shortcut.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white">
          <h3 className="mb-4 text-lg font-semibold">Ações rápidas do CRM</h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start rounded-2xl text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <action.icon className="mr-3 h-4 w-4" aria-hidden />
                {action.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white">
          <h3 className="mb-4 text-lg font-semibold">Atividades recentes 📈</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.action} className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-white/60">{activity.time}</p>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/10 text-xs text-white/70"
                >
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white">
          <h3 className="mb-4 text-lg font-semibold">Central de ajuda</h3>
          <div className="space-y-3 text-sm text-white/70">
            <p>Consulte materiais de apoio e fluxos sugeridos para o time comercial.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
                <HelpCircle className="mr-2 h-4 w-4" aria-hidden /> Documentação
              </Button>
              <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
                <Bell className="mr-2 h-4 w-4" aria-hidden /> Atualizações
              </Button>
            </div>
            <Button variant="ghost" className="rounded-2xl text-white/80 hover:bg-white/10">
              <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sair
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  )
}
