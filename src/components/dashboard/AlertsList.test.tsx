import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertsList } from './AlertsList';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));

function renderAlerts() {
  return render(
    <MemoryRouter>
      <AlertsList />
    </MemoryRouter>,
  );
}

describe('AlertsList', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('shows a calm message when there are no alerts', () => {
    useInventoryMock.mockReturnValue({
      getLowStockItems: () => [],
      getExpiringSoonItems: () => [],
      getExpiredItems: () => [],
    });

    renderAlerts();

    expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
  });

  it('shows an expired items section when items are expired', () => {
    useInventoryMock.mockReturnValue({
      getLowStockItems: () => [],
      getExpiringSoonItems: () => [],
      getExpiredItems: () => [
        { id: '1', name: 'Aspirin', category: 'medications', expirationDate: new Date(Date.now() - 86400000).toISOString() },
      ],
    });

    renderAlerts();

    expect(screen.getByText('Expired items')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });

  it('shows a low stock section when items are low', () => {
    useInventoryMock.mockReturnValue({
      getLowStockItems: () => [{ id: '1', name: 'Bandages', category: 'first-aid', quantity: 0, minQuantity: 2 }],
      getExpiringSoonItems: () => [],
      getExpiredItems: () => [],
    });

    renderAlerts();

    expect(screen.getByText('Low stock')).toBeInTheDocument();
  });
});
