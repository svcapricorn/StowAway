import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TemplatesPage from './Templates';

function renderTemplates() {
  return render(
    <MemoryRouter>
      <TemplatesPage />
    </MemoryRouter>,
  );
}

describe('TemplatesPage', () => {
  it('lists the reference templates', () => {
    renderTemplates();

    expect(screen.getByText('USCG Recreational First Aid Kit')).toBeInTheDocument();
    expect(screen.getByText('RYA Offshore Medical Kit')).toBeInTheDocument();
  });

  it('expands a template to show its recommended items', async () => {
    renderTemplates();
    const user = userEvent.setup();

    await user.click(screen.getByText('USCG Recreational First Aid Kit'));

    expect(screen.getByText(/Sterile gauze pads/)).toBeInTheDocument();
  });
});
