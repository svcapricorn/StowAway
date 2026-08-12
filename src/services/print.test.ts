import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printLabel, exportThermal } from './print';

vi.mock('jsbarcode', () => ({
  default: (svg: SVGElement, text: string) => {
    svg.innerHTML = `<text>${text}</text>`;
  },
}));

describe('printLabel', () => {
  it('throws a friendly error when the print window pop-up is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(() => printLabel({ barcode: 'SMLOC:galley', location: 'galley' })).toThrow(/pop-up blocked/i);
  });

  it('writes the label html into the opened print window', () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      onload: null as null | (() => void),
    };
    vi.spyOn(window, 'open').mockReturnValue(printWindow as any);

    printLabel({ barcode: 'SMLOC:galley', location: 'galley' });

    expect(printWindow.document.write).toHaveBeenCalled();
    expect(printWindow.document.write.mock.calls[0][0]).toContain('Galley');
    expect(printWindow.focus).toHaveBeenCalled();
  });
});

describe('exportThermal', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('generates a downloadable ESC/POS blob named after the barcode', () => {
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    exportThermal({ barcode: 'SMLOC:galley', location: 'galley' });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    (document.createElement as any).mockRestore();
  });
});
