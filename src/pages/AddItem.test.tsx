import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddItemPage from './AddItem';

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

vi.mock('@/components/inventory/ItemForm', () => ({
  ItemForm: (props: any) => (
    <div>
      ITEM FORM
      <button onClick={props.onScanLocationRequest}>trigger location scan</button>
      <button onClick={props.onScanProductBarcodeRequest}>trigger product scan</button>
      <button onClick={props.onScanObjectRequest}>trigger object scan</button>
      <div>scannedBarcode: {props.scannedBarcode ?? 'none'}</div>
      <div>scannedLocation: {props.scannedLocation ?? 'none'}</div>
      <div>identifiedObject: {props.identifiedObject?.name ?? 'none'}</div>
    </div>
  ),
}));

vi.mock('@/components/scanner/BarcodeScanner', () => ({
  BarcodeScanner: (props: any) =>
    props.isOpen ? (
      <div>
        <div>{props.title}</div>
        <button onClick={() => props.onScan('SMLOC:galley')}>simulate location code</button>
        <button onClick={() => props.onScan('012345678905')}>simulate product code</button>
      </div>
    ) : null,
}));

vi.mock('@/components/scanner/ObjectScanner', () => ({
  ObjectScanner: (props: any) =>
    props.isOpen ? (
      <button
        onClick={() =>
          props.onIdentify({ name: 'Ibuprofen', category: 'medications', confidence: 0.9 })
        }
      >
        simulate identify
      </button>
    ) : null,
}));

function renderPage(initialEntry = '/add') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AddItemPage />
    </MemoryRouter>,
  );
}

describe('AddItemPage', () => {
  it('renders the page heading and the item form', () => {
    renderPage();

    expect(screen.getByText('Add Item')).toBeInTheDocument();
    expect(screen.getByText('ITEM FORM')).toBeInTheDocument();
  });

  it('strips the barcode query param from the URL on mount', () => {
    renderPage('/add?barcode=012345678905');

    expect(window.location.search).toBe('');
  });

  it('sets the scanned location and shows a toast when a location code is scanned', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /trigger location scan/i }));
    expect(screen.getByText('Scan Location')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /simulate location code/i }));

    expect(screen.getByText('scannedLocation: galley')).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Location set' }));
  });

  it('warns when a non-location code is scanned in location mode', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /trigger location scan/i }));
    await user.click(screen.getByRole('button', { name: /simulate product code/i }));

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Not a location sticker', variant: 'destructive' }),
    );
    expect(screen.getByText('scannedBarcode: none')).toBeInTheDocument();
  });

  it('sets the scanned barcode when a product code is scanned in product mode', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /trigger product scan/i }));
    expect(screen.getByText('Scan Product Barcode')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /simulate product code/i }));

    expect(screen.getByText('scannedBarcode: 012345678905')).toBeInTheDocument();
  });

  it('sets the identified object when the object scanner reports a match', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /trigger object scan/i }));
    await user.click(screen.getByRole('button', { name: /simulate identify/i }));

    expect(screen.getByText('identifiedObject: Ibuprofen')).toBeInTheDocument();
  });
});
