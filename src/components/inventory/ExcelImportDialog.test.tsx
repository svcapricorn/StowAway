import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('shows an error for a CSV file with no data rows', async () => {
    const file = new File(['Label Name,Category'], 'empty.csv', { type: 'text/csv' });

    render(<ExcelImportDialog open onClose={vi.fn()} />);
    const user = userEvent.setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText(/failed to parse file/i)).toBeInTheDocument();
  });

  it('edits a cell value before importing', async () => {
    const csv = 'Label Name,Category,Quantity,Min. Stock\nBandages,first-aid,5,1\n';
    const file = new File([csv], 'items.csv', { type: 'text/csv' });

    render(<ExcelImportDialog open onClose={vi.fn()} />);
    const user = userEvent.setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    const nameField = await screen.findByDisplayValue('Bandages');

    await user.clear(nameField);
    await user.type(nameField, 'Gauze Pads');

    await user.click(screen.getByRole('button', { name: /import items/i }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem.mock.calls[0][0].name).toBe('Gauze Pads');
  });

  it('removes a row when its delete button is clicked', async () => {
    const csv = 'Label Name,Category,Quantity,Min. Stock\nBandages,first-aid,5,1\n';
    const file = new File([csv], 'items.csv', { type: 'text/csv' });

    render(<ExcelImportDialog open onClose={vi.fn()} />);
    const user = userEvent.setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    const nameField = await screen.findByDisplayValue('Bandages');

    const row = nameField.closest('tr') as HTMLTableRowElement;
    const deleteButton = within(row).getByRole('button');
    await user.click(deleteButton);

    expect(screen.queryByDisplayValue('Bandages')).not.toBeInTheDocument();
  });

  it('shows an error message when saving fails', async () => {
    addItem.mockRejectedValueOnce(new Error('offline'));
    const csv = 'Label Name,Category,Quantity,Min. Stock\nBandages,first-aid,5,1\n';
    const file = new File([csv], 'items.csv', { type: 'text/csv' });

    render(<ExcelImportDialog open onClose={vi.fn()} />);
    const user = userEvent.setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await screen.findByDisplayValue('Bandages');

    await user.click(screen.getByRole('button', { name: /import items/i }));

    expect(await screen.findByText(/failed to save items/i)).toBeInTheDocument();
  });

  it('downloads a template file when requested', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:fake');
    const revokeObjectURL = vi.fn();
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ExcelImportDialog open onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /download template/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
