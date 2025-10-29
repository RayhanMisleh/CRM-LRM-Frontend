import { notFound } from 'next/navigation'

import { ClientDetailView } from '@/features/clients/components/client-detail-view'
import { getClient } from '@/features/clients/api'
import type { ApiHttpError } from '@/lib/api'

interface ClientPageProps {
  params: { clientId: string }
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = params

  let client
  try {
    client = await getClient(clientId)
  } catch (error) {
    const apiError = error as ApiHttpError
    if (apiError?.status === 404) {
      notFound()
    }
    throw error
  }

  return <ClientDetailView clientId={client.id} initialData={client} />
}
