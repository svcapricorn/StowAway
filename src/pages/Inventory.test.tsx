import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from './Inventory';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

let capturedOnScan: ((code: string) => void) | undefined;
let capturedOnConfirmAdd: ((id: string, amount: number) => Promise<void>) | undefined;
vi.mock('@/components/inventory/InventoryList', () => ({ InventoryList: () => <div>INVENTORY LIST</div> }));
vi.mock('@/components/inventory/ExcelImportDialog', () => ({ ExcelImportDialog: () => null }));
vi.mock('@/components/inventory/QuickAddDialog', () => ({
  QuickAddDialog: ({ open, item, onConfirmAdd }: any) => {
    capturedOnConfirmAdd = onConfirmAdd;
    return open ? <div>QUICK ADD: {item?.name}</div> : null;
  },
}));
vi.mock('@/components/scanner/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan }: any) => {
    capturedOnScan = onScan;
    return null;
  },
}));

import { toast } from '@/hooks/use-toast';

function renderInventoryPage() {
  return render(
    <MemoryRouter>
      <InventoryPage />
    </MemoryRouter>,
  );
}

describe('InventoryPage', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
    useInventoryMock.mockReturnValue({ items: [], updateItem: vi.fn() });
  });

  it('renders the inventory list and import/scan actions', () => {
    renderInventoryPage();

    expect(screen.getByText('INVENTORY LIST')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan location/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import excel/i })).toBeInTheDocument();
  });

  it('opens quick add for a scanned barcode matching an existing item', async () => {
    useInventoryMock.mockReturnValue({
      items: [{ id: '1', name: 'Bandages', barcode: '049000028911' }],
      updateItem: vi.fn(),
    });

    renderInventoryPage();
    await userEvent.click(screen.getByRole('button', { name: /scan location/i }));
    capturedOnScan?.('049000028911');

    expect(await screen.findByText('QUICK ADD: Bandages')).toBeInTheDocument();
  });

  it('shows a toast for an unrecognized barcode', async () => {
    useInventoryMock.mockReturnValue({ items: [], updateItem: vi.fn() });

    renderInventoryPage();
    capturedOnScan?.('unknown-code');

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unknown barcode' }));
  });

  it('confirms a quick-add stock update and shows a success toast', async () => {
    const updateItem = vi.fn().mockResolvedValue(undefined);
    useInventoryMock.mockReturnValue({
      items: [{ id: '1', name: 'Bandages', barcode: '049000028911', quantity: 5 }],
      updateItem,
    });

    renderInventoryPage();
    await userEvent.click(screen.getByRole('button', { name: /scan location/i }));
    capturedOnScan?.('049000028911');
    await screen.findByText('QUICK ADD: Bandages');

    await capturedOnConfirmAdd?.('1', 3);

    expect(updateItem).toHaveBeenCalledWith('1', { quantity: 8 });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stock Updated' }));
  });
});
