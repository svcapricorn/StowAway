import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExcelImportDialog } from './ExcelImportDialog';

const addItem = vi.fn().mockResolvedValue(undefined);
vi.mock('@/context/InventoryContext', () => ({
  useInventory: () => ({ addItem }),
}));

describe('ExcelImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('shows the upload prompt when there is no data yet', () => {
    render(<ExcelImportDialog open onClose={vi.fn()} />);

    expect(screen.getByText('Upload Excel or CSV File')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import items/i })).toBeDisabled();
  });

  it('parses an uploaded CSV file into editable rows', async () => {
    const csv = 'Label Name,Category,Quantity,Min. Stock\nBandages,first-aid,5,1\n';
    const file = new File([csv], 'items.csv', { type: 'text/csv' });

    render(<ExcelImportDialog open onClose={vi.fn()} />);
    const user = userEvent.setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByDisplayValue('Bandages')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /import items/i })).toBeEnabled();
  });

  it('imports all parsed rows and closes the dialog on confirm', async () => {
    const csv = 'Label Name,Category,Quantity,Min. Stock\nBandages,first-aid,5,1\n';
    const file = new File([csv], 'items.csv', { type: 'text/csv' });
    const onClose = vi.fn();

    render(<ExcelImportDialog open onClose={onClose} />);
    const user = userEvent.setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByDisplayValue('Bandages')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /import items/i }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem.mock.calls[0][0].name).toBe('Bandages');
    expect(onClose).toHaveBeenCalled();
  });
});
