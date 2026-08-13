import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ItemDetailPage from './ItemDetail';

const useInventoryMock = vi.fn();
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => useInventoryMock(),
}));
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

vi.mock('@/components/inventory/ItemForm', () => ({
  ItemForm: (props: any) => (
    <div>
      ITEM FORM
      <button onClick={props.onScanLocationRequest}>trigger location scan</button>
      <button onClick={props.onScanObjectRequest}>trigger object scan</button>
      <div>identifiedObject: {props.identifiedObject?.name ?? 'none'}</div>
    </div>
  ),
}));
vi.mock('@/components/scanner/BarcodeScanner', () => ({
  BarcodeScanner: (props: any) =>
    props.isOpen ? <button onClick={() => props.onScan('SMLOC:galley')}>simulate scan</button> : null,
}));
vi.mock('@/components/scanner/ObjectScanner', () => ({
  ObjectScanner: (props: any) =>
    props.isOpen ? (
      <button onClick={() => props.onIdentify({ name: 'Aspirin', category: 'medications', confidence: 0.9 })}>
        simulate identify
      </button>
    ) : null,
}));

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

  it('shows a loading skeleton while inventory is loading', () => {
    useInventoryMock.mockReturnValue({ getItemById: () => undefined, isLoading: true });

    const { container } = renderDetail('1');

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
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

  it('sets the scanned location and shows a toast when a location code is scanned', async () => {
    useInventoryMock.mockReturnValue({ getItemById: () => ({ id: '1', name: 'Bandages' }), isLoading: false });
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: /trigger location scan/i }));
    await user.click(screen.getByRole('button', { name: /simulate scan/i }));

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Location set' }));
  });

  it('sets the identified object when the object scanner reports a match', async () => {
    useInventoryMock.mockReturnValue({ getItemById: () => ({ id: '1', name: 'Bandages' }), isLoading: false });
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: /trigger object scan/i }));
    await user.click(screen.getByRole('button', { name: /simulate identify/i }));

    expect(screen.getByText('identifiedObject: Aspirin')).toBeInTheDocument();
  });
});
