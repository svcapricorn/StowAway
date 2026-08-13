import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GenerateLabelPage from './GenerateLabel';

vi.mock('@/components/labels/LabelPreview', () => ({ LabelPreview: () => <div>LABEL PREVIEW</div> }));
vi.mock('@/services/print', () => ({
  printLabel: vi.fn(),
  exportLabelPDF: vi.fn().mockResolvedValue(undefined),
  exportThermal: vi.fn(),
}));
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

import { printLabel, exportLabelPDF, exportThermal } from '@/services/print';

function renderGenerateLabel() {
  return render(
    <MemoryRouter>
      <GenerateLabelPage />
    </MemoryRouter>,
  );
}

describe('GenerateLabelPage', () => {
  it('renders a location selector and the label preview', () => {
    renderGenerateLabel();

    expect(screen.getByText('Location Labels')).toBeInTheDocument();
    expect(screen.getByText('LABEL PREVIEW')).toBeInTheDocument();
  });

  it('calls printLabel when Browser Print is clicked', async () => {
    renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(screen.getByText('Browser Print'));

    expect(printLabel).toHaveBeenCalled();
  });

  it('shows an error toast when printing fails', async () => {
    (printLabel as any).mockImplementationOnce(() => {
      throw new Error('Pop-up blocked');
    });
    renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(screen.getByText('Browser Print'));

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Print failed' }));
  });

  it('exports a PDF and shows a success toast', async () => {
    renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(screen.getByText(/download pdf/i));

    await waitFor(() => expect(exportLabelPDF).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'PDF downloaded' }));
  });

  it('shows an error toast when PDF export fails', async () => {
    (exportLabelPDF as any).mockRejectedValueOnce(new Error('boom'));
    renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(screen.getByText(/download pdf/i));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'PDF export failed' })),
    );
  });

  it('exports a thermal file and shows a success toast', async () => {
    renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(screen.getByText(/thermal/i));

    expect(exportThermal).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Thermal file downloaded' }));
  });

  it('shows an error toast when thermal export fails', async () => {
    (exportThermal as any).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(screen.getByText(/thermal/i));

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Thermal export failed' }));
  });

  it('includes a sticker note once the toggle is enabled', async () => {
    const { container } = renderGenerateLabel();
    const user = userEvent.setup();

    await user.click(container.querySelector('input[type="checkbox"]')!);
    await user.type(screen.getByLabelText(/sticker note/i), 'Port side');

    await user.click(screen.getByText('Browser Print'));

    expect(printLabel).toHaveBeenCalledWith(expect.objectContaining({ labelNote: 'Port side' }));
  });
});
