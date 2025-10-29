import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { InvoicesTable } from '../invoices-table'

const useInvoicesMock = vi.fn()

vi.mock('../../api', () => ({
  useInvoices: (filters: unknown) => useInvoicesMock(filters),
}))

const createDefaultProps = () => ({
  filters: {},
  page: 1,
  pageSize: 10,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onEdit: vi.fn(),
  onMarkAsPaid: vi.fn(),
})

describe('InvoicesTable', () => {
  beforeEach(() => {
    useInvoicesMock.mockReset()
  })

  it('renderiza estado vazio quando não há faturas', () => {
    useInvoicesMock.mockReturnValue({
      data: { data: [], meta: { totalItems: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    })

    const props = createDefaultProps()

    render(<InvoicesTable {...props} isProcessing={false} />)

    expect(
      screen.getByText('Nenhuma fatura encontrada com os filtros selecionados.'),
    ).toBeInTheDocument()
  })

  it('dispara ações de edição e marcação como paga', async () => {
    const invoice = {
      id: 'inv-1',
      number: 'FAT-001',
      issueDate: '2024-01-01',
      clientId: 'client-1',
      client: { companyName: 'Empresa X', tradeName: 'Empresa X' },
      contract: { title: 'Contrato principal' },
      amount: 1200,
      currency: 'BRL',
      dueDate: '2024-02-01',
      status: 'pending',
    }

    const props = createDefaultProps()
    const onEdit = vi.fn()
    const onMarkAsPaid = vi.fn()

    useInvoicesMock.mockReturnValue({
      data: { data: [invoice], meta: { totalItems: 1, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    })

    render(
      <InvoicesTable
        {...props}
        onEdit={onEdit}
        onMarkAsPaid={onMarkAsPaid}
        isProcessing={false}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /ações/i }))

    await userEvent.click(screen.getByRole('menuitem', { name: /editar fatura/i }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-1' }))

    await userEvent.click(screen.getByRole('button', { name: /ações/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /marcar como paga/i }))
    expect(onMarkAsPaid).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-1' }))
  })
})
