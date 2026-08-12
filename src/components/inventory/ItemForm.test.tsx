import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ItemForm } from './ItemForm';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const addItem = vi.fn().mockResolvedValue(undefined);
const updateItem = vi.fn().mockResolvedValue(undefined);
const deleteItem = vi.fn().mockResolvedValue(undefined);

vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => ({ addItem, updateItem, deleteItem }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

function renderForm(props: Partial<React.ComponentProps<typeof ItemForm>> = {}) {
  return render(
    <MemoryRouter>
      <ItemForm {...props} />
    </MemoryRouter>,
  );
}

describe('ItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Add Item" for a new item with no delete action', () => {
    renderForm();

    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove item/i })).not.toBeInTheDocument();
  });

  it('shows "Update Item" and "Remove Item" when editing an existing item', () => {
    renderForm({
      existingItem: {
        id: '1',
        name: 'Bandages',
        category: 'first-aid',
        quantity: 5,
        minQuantity: 1,
        location: 'galley',
        createdAt: '',
        updatedAt: '',
      } as any,
    });

    expect(screen.getByRole('button', { name: /update item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove item/i })).toBeInTheDocument();
  });

  it('does not submit when the name is empty', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() => expect(addItem).not.toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('submits a new item with the entered name and navigates to the inventory list', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/label name/i), 'Gauze Pads');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem.mock.calls[0][0].name).toBe('Gauze Pads');
    expect(navigateMock).toHaveBeenCalledWith('/inventory');
  });

  it('updates an existing item on submit', async () => {
    renderForm({
      existingItem: {
        id: '1',
        name: 'Bandages',
        category: 'first-aid',
        quantity: 5,
        minQuantity: 1,
        location: 'galley',
        createdAt: '',
        updatedAt: '',
      } as any,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /update item/i }));

    await waitFor(() => expect(updateItem).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Bandages' })));
  });

  it('deletes the item after confirming in the delete dialog', async () => {
    renderForm({
      existingItem: {
        id: '1',
        name: 'Bandages',
        category: 'first-aid',
        quantity: 5,
        minQuantity: 1,
        location: 'galley',
        createdAt: '',
        updatedAt: '',
      } as any,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /remove item/i }));
    expect(screen.getByText('Remove this item?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(deleteItem).toHaveBeenCalledWith('1'));
    expect(navigateMock).toHaveBeenCalledWith('/inventory');
  });
});
