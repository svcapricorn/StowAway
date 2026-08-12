import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>PAGE CONTENT</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('renders the nested page content via the outlet', () => {
    useInventoryMock.mockReturnValue({
      stats: { lowStockCount: 0, expiringSoonCount: 0, expiredCount: 0 },
      isLoading: false,
    });

    renderShell();

    expect(screen.getByText('PAGE CONTENT')).toBeInTheDocument();
    expect(screen.getByText('StowAway')).toBeInTheDocument();
  });

  it('shows an alert badge when there is something to review', () => {
    useInventoryMock.mockReturnValue({
      stats: { lowStockCount: 2, expiringSoonCount: 1, expiredCount: 0 },
      isLoading: false,
    });

    renderShell();

    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides the alert badge while inventory is still loading', () => {
    useInventoryMock.mockReturnValue({
      stats: { lowStockCount: 5, expiringSoonCount: 0, expiredCount: 0 },
      isLoading: true,
    });

    renderShell();

    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
  });

  it('navigates to the inventory tab when clicked', async () => {
    useInventoryMock.mockReturnValue({
      stats: { lowStockCount: 0, expiringSoonCount: 0, expiredCount: 0 },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<div>PAGE CONTENT</div>} />
            <Route path="/inventory" element={<div>INVENTORY PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('Inventory'));

    expect(await screen.findByText('INVENTORY PAGE')).toBeInTheDocument();
  });
});
