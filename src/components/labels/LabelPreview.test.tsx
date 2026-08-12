import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LabelPreview } from './LabelPreview';

vi.mock('@/services/barcode', async () => {
  const actual = await vi.importActual<typeof import('@/services/barcode')>('@/services/barcode');
  return {
    ...actual,
    generateBarcodeSvg: vi.fn().mockReturnValue('<svg data-mock="barcode"></svg>'),
  };
});

describe('LabelPreview', () => {
  it('renders a barcode svg for the given label data', () => {
    const { container } = render(<LabelPreview data={{ barcode: 'SMLOC:galley', location: 'galley' }} />);

    expect(container.querySelector('svg')).toBeTruthy();
  });
});
