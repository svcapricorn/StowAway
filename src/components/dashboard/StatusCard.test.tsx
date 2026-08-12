import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusCard } from './StatusCard';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));

describe('StatusCard', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('shows a success message when nothing needs attention', () => {
    useInventoryMock.mockReturnValue({
      stats: { expiredCount: 0, lowStockCount: 0, expiringSoonCount: 0 },
      items: [{ id: '1' }, { id: '2' }],
    });

    render(<StatusCard />);

    expect(screen.getByText('Your medical kit is shipshape')).toBeInTheDocument();
    expect(screen.getByText(/all 2 items/i)).toBeInTheDocument();
  });

  it('shows an error message when items are expired', () => {
    useInventoryMock.mockReturnValue({
      stats: { expiredCount: 1, lowStockCount: 0, expiringSoonCount: 0 },
      items: [{ id: '1' }],
    });

    render(<StatusCard />);

    expect(screen.getByText('Attention needed before departure')).toBeInTheDocument();
  });

  it('shows a warning message when items are only expiring soon', () => {
    useInventoryMock.mockReturnValue({
      stats: { expiredCount: 0, lowStockCount: 0, expiringSoonCount: 1 },
      items: [{ id: '1' }],
    });

    render(<StatusCard />);

    expect(screen.getByText('A few items to review')).toBeInTheDocument();
  });
});
