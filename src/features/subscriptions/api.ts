import {
  useCreateClientSubscription,
  type CreateClientSubscriptionInput,
} from '@/features/clients/api'

export type CreateSubscriptionInput = CreateClientSubscriptionInput

export const useCreateSubscription = () => {
  return useCreateClientSubscription()
}
