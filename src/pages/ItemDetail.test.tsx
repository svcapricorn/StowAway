import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ItemDetailPage from './ItemDetail';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));
vi.mock('@/components/inventory/ItemForm', () => ({ ItemForm: () => <div>ITEM FORM</div> }));
vi.mock('@/components/scanner/BarcodeScanner', () => ({ BarcodeScanner: () => null }));
vi.mock('@/components/scanner/ObjectScanner', () => ({ ObjectScanner: () => null }));

function renderDetail(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/inventory/${id}`]}>
      <Routes>
        <Route path="/inventory" element={<div>INVENTORY LIST</div>} />
        <Route path="/inventory/:id" element={<ItemDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ItemDetailPage', () => {
  beforeEach(() => {
    useInventoryMock.mockReset();
  });

  it('renders the item form when the item exists', () => {
    useInventoryMock.mockReturnValue({
      getItemById: () => ({ id: '1', name: 'Bandages' }),
      isLoading: false,
    });

    renderDetail('1');

    expect(screen.getByText('Bandages')).toBeInTheDocument();
    expect(screen.getByText('ITEM FORM')).toBeInTheDocument();
  });

  it('redirects to the inventory list when the item does not exist', async () => {
    useInventoryMock.mockReturnValue({
      getItemById: () => undefined,
      isLoading: false,
    });

    renderDetail('missing');

    expect(await screen.findByText('INVENTORY LIST')).toBeInTheDocument();
  });
});
