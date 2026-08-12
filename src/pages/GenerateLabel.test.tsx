import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GenerateLabelPage from './GenerateLabel';

vi.mock('@/components/labels/LabelPreview', () => ({ LabelPreview: () => <div>LABEL PREVIEW</div> }));
vi.mock('@/services/print', () => ({
  printLabel: vi.fn(),
  exportLabelPDF: vi.fn().mockResolvedValue(undefined),
  exportThermal: vi.fn(),
}));

import { printLabel } from '@/services/print';

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
});
