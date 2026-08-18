import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));

vi.mock('@/components/dashboard/MetricGrid', () => ({ MetricGrid: () => <div>METRIC GRID</div> }));
vi.mock('@/components/dashboard/AlertsList', () => ({ AlertsList: () => <div>ALERTS LIST</div> }));
vi.mock('@/components/dashboard/QuickStats', () => ({ QuickStats: () => <div>QUICK STATS</div> }));

const emptyStats = {
  totalItems: 0,
  lowStockCount: 0,
  expiringSoonCount: 0,
  expiredCount: 0,
  categoryCounts: {},
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('shows loading skeletons while inventory data is loading', () => {
    useInventoryMock.mockReturnValue({ items: [], stats: emptyStats, exportToCSV: vi.fn(), isLoading: true });

    renderDashboard();

    expect(screen.queryByText('METRIC GRID')).not.toBeInTheDocument();
  });

  it('renders the dashboard sections once data has loaded', () => {
    useInventoryMock.mockReturnValue({ items: [{ id: '1' }], stats: emptyStats, exportToCSV: vi.fn(), isLoading: false });

    renderDashboard();

    expect(screen.getByText('METRIC GRID')).toBeInTheDocument();
    expect(screen.getByText('ALERTS LIST')).toBeInTheDocument();
    expect(screen.getByText('QUICK STATS')).toBeInTheDocument();
  });

  it('disables the export button when there are no items', () => {
    useInventoryMock.mockReturnValue({ items: [], stats: emptyStats, exportToCSV: vi.fn(), isLoading: false });

    renderDashboard();

    const buttons = screen.getAllByRole('button');
    const exportButton = buttons[buttons.length - 1];
    expect(exportButton).toBeDisabled();
  });

  it('exports a CSV file when items are present', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    useInventoryMock.mockReturnValue({
      items: [{ id: '1' }],
      stats: emptyStats,
      exportToCSV: vi.fn().mockReturnValue('a,b\n1,2'),
      isLoading: false,
    });

    renderDashboard();
    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1].click();

    expect(clickSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Export complete. Your inventory has been exported to CSV.');

    (document.createElement as any).mockRestore();
    alertSpy.mockRestore();
  });
});
