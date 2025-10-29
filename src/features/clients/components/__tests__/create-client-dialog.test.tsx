import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { CreateClientDialog } from '../create-client-dialog'

type UseCreateClientReturn = {
  mutateAsync: ReturnType<typeof vi.fn>
  isPending: boolean
}

const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}))

vi.mock('../../api', () => ({
  useCreateClient: vi.fn<[], UseCreateClientReturn>(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}))

describe('CreateClientDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe mensagens de validação quando campos obrigatórios estão vazios', async () => {
    const onOpenChange = vi.fn()
    const { useCreateClient } = await import('../../api')
    const mutateAsync = vi.fn()
    vi.mocked(useCreateClient).mockReturnValue({ mutateAsync, isPending: false })

    render(<CreateClientDialog open onOpenChange={onOpenChange} />)

    const submitButton = screen.getByRole('button', { name: /criar cliente/i })
    await userEvent.click(submitButton)

    expect(await screen.findByText('Informe a razão social')).toBeInTheDocument()
    expect(await screen.findByText('Informe o CNPJ')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('envia os dados e fecha o diálogo quando a mutation é bem-sucedida', async () => {
    const onOpenChange = vi.fn()
    const { useCreateClient } = await import('../../api')
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'client-1' })
    vi.mocked(useCreateClient).mockReturnValue({ mutateAsync, isPending: false })

    render(<CreateClientDialog open onOpenChange={onOpenChange} />)

    const companyInput = screen.getByLabelText('Razão social')
    const cnpjInput = screen.getByLabelText('CNPJ')

    await userEvent.type(companyInput, 'Acme LTDA')
    await userEvent.clear(cnpjInput)
    await userEvent.type(cnpjInput, '34.926.770/0420-03')

    const submitButton = screen.getByRole('button', { name: /criar cliente/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Acme LTDA',
          cnpj: '34926770042003',
          status: 'active',
        }),
      )
    })

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cliente criado',
      }),
    )
  })
})
