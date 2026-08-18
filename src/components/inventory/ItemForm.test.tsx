import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ItemForm } from './ItemForm';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const addItem = vi.fn().mockResolvedValue(undefined);
const updateItem = vi.fn().mockResolvedValue(undefined);
const deleteItem = vi.fn().mockResolvedValue(undefined);

vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => ({ addItem, updateItem, deleteItem }),
}));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

function renderForm(props: Partial<React.ComponentProps<typeof ItemForm>> = {}) {
  return render(
    <MemoryRouter>
      <ItemForm {...props} />
    </MemoryRouter>,
  );
}

const existingItem = {
  id: '1',
  name: 'Bandages',
  category: 'first-aid',
  quantity: 5,
  minQuantity: 1,
  location: 'galley',
  createdAt: '',
  updatedAt: '',
} as any;

describe('ItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Add Item" for a new item with no delete action', () => {
    renderForm();

    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove item/i })).not.toBeInTheDocument();
  });

  it('shows "Update Item" and "Remove Item" when editing an existing item', () => {
    renderForm({
      existingItem: {
        id: '1',
        name: 'Bandages',
        category: 'first-aid',
        quantity: 5,
        minQuantity: 1,
        location: 'galley',
        createdAt: '',
        updatedAt: '',
      } as any,
    });

    expect(screen.getByRole('button', { name: /update item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove item/i })).toBeInTheDocument();
  });

  it('does not submit when the name is empty', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() => expect(addItem).not.toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('submits a new item with the entered name and navigates to the inventory list', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/label name/i), 'Gauze Pads');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem.mock.calls[0][0].name).toBe('Gauze Pads');
    expect(navigateMock).toHaveBeenCalledWith('/inventory');
  });

  it('updates an existing item on submit', async () => {
    renderForm({
      existingItem: {
        id: '1',
        name: 'Bandages',
        category: 'first-aid',
        quantity: 5,
        minQuantity: 1,
        location: 'galley',
        createdAt: '',
        updatedAt: '',
      } as any,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /update item/i }));

    await waitFor(() => expect(updateItem).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Bandages' })));
  });

  it('deletes the item after confirming in the delete dialog', async () => {
    renderForm({
      existingItem: {
        id: '1',
        name: 'Bandages',
        category: 'first-aid',
        quantity: 5,
        minQuantity: 1,
        location: 'galley',
        createdAt: '',
        updatedAt: '',
      } as any,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /remove item/i }));
    expect(screen.getByText('Remove this item?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(deleteItem).toHaveBeenCalledWith('1'));
    expect(navigateMock).toHaveBeenCalledWith('/inventory');
  });

  it('cancels the delete dialog without deleting', async () => {
    renderForm({ existingItem });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /remove item/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByText('Remove this item?')).not.toBeInTheDocument());
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('shows a validation error for a negative quantity and does not submit', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/label name/i), 'Aspirin');
    const quantityInput = screen.getByLabelText(/^quantity$/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, '-1');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    expect(await screen.findByText('Quantity must be 0 or more')).toBeInTheDocument();
    expect(addItem).not.toHaveBeenCalled();
  });

  it('shows an error toast and stops submitting when addItem fails', async () => {
    addItem.mockRejectedValueOnce(new Error('network down'));
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/label name/i), 'Gauze Pads');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' }),
      ),
    );
    expect(navigateMock).not.toHaveBeenCalledWith('/inventory');
  });

  it('shows an error toast when deleteItem fails', async () => {
    deleteItem.mockRejectedValueOnce(new Error('network down'));
    renderForm({ existingItem });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /remove item/i }));
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' }),
      ),
    );
  });

  it('navigates back when Cancel is clicked', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('fires the scan request callbacks', async () => {
    const onScanLocationRequest = vi.fn();
    const onScanObjectRequest = vi.fn();
    const onScanProductBarcodeRequest = vi.fn();
    renderForm({ onScanLocationRequest, onScanObjectRequest, onScanProductBarcodeRequest });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /scan location/i }));
    await user.click(screen.getByRole('button', { name: /identify item/i }));
    await user.click(screen.getByRole('button', { name: /scan retail product barcode/i }));

    expect(onScanLocationRequest).toHaveBeenCalledTimes(1);
    expect(onScanObjectRequest).toHaveBeenCalledTimes(1);
    expect(onScanProductBarcodeRequest).toHaveBeenCalledTimes(1);
  });

  it('populates the form and shows a toast when an object is identified', () => {
    renderForm({
      identifiedObject: {
        name: 'Ibuprofen 200mg',
        category: 'medications',
        confidence: 0.92,
        image: 'data:image/jpeg;base64,fake',
        barcode: '012345678905',
      },
    });

    expect(screen.getByLabelText(/label name/i)).toHaveValue('Ibuprofen 200mg');
    expect(screen.getByText(/product barcode: 012345678905/i)).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Item identified' }),
    );
  });

  describe('scanned barcode product lookup', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('fills in the product name when OpenFoodFacts finds a match', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 1, product: { product_name: 'Ibuprofen Tablets' } }),
      }) as any;

      renderForm({ scannedBarcode: '012345678905' });

      expect(await screen.findByLabelText(/label name/i)).toHaveValue('Ibuprofen Tablets');
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Product Found' }));
    });

    it('shows a toast when the barcode is recognized but has no product name', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 1, product: {} }),
      }) as any;

      renderForm({ scannedBarcode: '012345678905' });

      await waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'No product details found' })),
      );
    });

    it('shows a toast when the barcode is not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 0 }),
      }) as any;

      renderForm({ scannedBarcode: '000000000000' });

      await waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Product not found' })),
      );
    });

    it('shows a destructive toast when the lookup request fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as any;

      renderForm({ scannedBarcode: '012345678905' });

      await waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Lookup failed', variant: 'destructive' }),
        ),
      );
    });
  });

  it('adds and removes a photo', async () => {
    renderForm();
    const user = userEvent.setup();

    const file = new File(['fake-image-bytes'], 'item.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByAltText('Photo 1 of this item')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /remove photo 1/i }));

    expect(screen.queryByAltText('Photo 1 of this item')).not.toBeInTheDocument();

  });
});
