import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { InventoryList } from './InventoryList';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));

function renderList() {
  return render(
    <MemoryRouter>
      <InventoryList />
    </MemoryRouter>,
  );
}

describe('InventoryList', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('shows an empty state with an add-item link when there are no items', () => {
    useInventoryMock.mockReturnValue({
      items: [],
      stats: { lowStockCount: 0, expiringSoonCount: 0, expiredCount: 0, categoryCounts: {} },
    });

    renderList();

    expect(screen.getByText('No items in your inventory yet.')).toBeInTheDocument();
    expect(screen.getByText(/add your first item/i)).toBeInTheDocument();
  });

  it('renders items and filters them by search text', async () => {
    useInventoryMock.mockReturnValue({
      items: [
        { id: '1', name: 'Bandages', category: 'first-aid', quantity: 5, minQuantity: 1, location: 'galley' },
        { id: '2', name: 'Aspirin', category: 'medications', quantity: 3, minQuantity: 1, location: 'galley' },
      ],
      stats: {
        lowStockCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        categoryCounts: { 'first-aid': 1, medications: 1, tools: 0, emergency: 0, hygiene: 0, diagnostic: 0, ppe: 0, other: 0 },
      },
    });

    renderList();

    expect(screen.getByText('Bandages')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Search supplies...'), 'Aspirin');

    expect(screen.queryByText('Bandages')).not.toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });
});
