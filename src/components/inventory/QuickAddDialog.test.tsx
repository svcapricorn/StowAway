import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QuickAddDialog } from './QuickAddDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof QuickAddDialog>> = {}) {
  return render(
    <MemoryRouter>
      <QuickAddDialog open onClose={vi.fn()} onConfirmAdd={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('QuickAddDialog', () => {
  it('shows a not-found state and a create-new action when there is no matching item', () => {
    renderDialog({ item: undefined, scannedBarcode: '049000028911' });

    expect(screen.getByText(/049000028911/)).toBeInTheDocument();
  });

  it('shows the current quantity and confirms an add for an existing item', async () => {
    const onConfirmAdd = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderDialog({
      item: { id: '1', name: 'Bandages', quantity: 5 } as any,
      onConfirmAdd,
      onClose,
    });

    expect(screen.getByText('Bandages')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add stock|confirm/i }));

    expect(onConfirmAdd).toHaveBeenCalledWith('1', 1);
  });

  it('increments and decrements the amount, never going below 1', async () => {
    renderDialog({ item: { id: '1', name: 'Bandages', quantity: 5 } as any });
    const user = userEvent.setup();

    const buttons = screen.getAllByRole('button');
    const minusButton = buttons.find(b => b.querySelector('svg.lucide-minus'))!;
    const plusButton = buttons.find(b => b.querySelector('svg.lucide-plus'))!;

    await user.click(plusButton);
    await user.click(plusButton);
    expect(screen.getByRole('spinbutton')).toHaveValue(3);

    await user.click(minusButton);
    await user.click(minusButton);
    await user.click(minusButton);
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
  });

  it('navigates to create a new item with the scanned barcode when not found', async () => {
    const onClose = vi.fn();
    renderDialog({ item: undefined, scannedBarcode: '049000028911', onClose });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /create new item/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
