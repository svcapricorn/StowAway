import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickStats } from './QuickStats';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));

function renderQuickStats() {
  return render(
    <MemoryRouter>
      <QuickStats />
    </MemoryRouter>,
  );
}

describe('QuickStats', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('renders nothing when there are no items', () => {
    useInventoryMock.mockReturnValue({
      stats: { categoryCounts: {} },
      items: [],
    });

    const { container } = renderQuickStats();

    expect(container).toBeEmptyDOMElement();
  });

  it('lists categories that have at least one item', () => {
    useInventoryMock.mockReturnValue({
      stats: {
        categoryCounts: {
          'first-aid': 3,
          medications: 0,
          tools: 1,
          emergency: 0,
          hygiene: 0,
          diagnostic: 0,
          ppe: 0,
          other: 0,
        },
      },
      items: [{ id: '1' }],
    });

    renderQuickStats();

    expect(screen.getByText('First Aid')).toBeInTheDocument();
    expect(screen.getByText('Medical Tools')).toBeInTheDocument();
    expect(screen.queryByText('Medications')).not.toBeInTheDocument();
  });
});
