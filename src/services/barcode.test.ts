import { describe, it, expect, vi } from 'vitest';

// jsdom doesn't implement HTMLCanvasElement.getContext(), which jsbarcode's SVG
// renderer uses internally for text measurement. Mock it so we test our own
// wrapper logic instead of the third-party rendering internals.
vi.mock('jsbarcode', () => ({
  default: (svg: SVGElement, text: string) => {
    svg.setAttribute('data-barcode-text', text);
    svg.innerHTML = `<text>${text}</text>`;
  },
}));

import {
  LOCATION_BARCODE_PREFIX,
  encodeLocationBarcode,
  parseLocationBarcode,
  isLocationBarcode,
  generateBarcodeSvg,
  getLocationLabel,
  buildLabelHtml,
  svgToDataUrl,
} from './barcode';

describe('encodeLocationBarcode', () => {
  it('prefixes the location with the location barcode prefix', () => {
    expect(encodeLocationBarcode('galley')).toBe(`${LOCATION_BARCODE_PREFIX}galley`);
  });
});

describe('parseLocationBarcode', () => {
  it('parses a valid location barcode back into the location', () => {
    expect(parseLocationBarcode('SMLOC:galley')).toBe('galley');
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(parseLocationBarcode('  SMLOC:galley  ')).toBe('galley');
  });

  it('returns null for values without the location prefix', () => {
    expect(parseLocationBarcode('049000028911')).toBeNull();
  });

  it('returns null for an unknown location after the prefix', () => {
    expect(parseLocationBarcode('SMLOC:not-a-real-location')).toBeNull();
  });
});

describe('isLocationBarcode', () => {
  it('returns true for a valid location barcode', () => {
    expect(isLocationBarcode('SMLOC:head-fore')).toBe(true);
  });

  it('returns false for a plain product barcode', () => {
    expect(isLocationBarcode('049000028911')).toBe(false);
  });
});

describe('getLocationLabel', () => {
  it('returns the human-readable label for a known location', () => {
    expect(getLocationLabel('galley')).toBe('Galley');
  });

  it('falls back to the raw value for an unknown location', () => {
    expect(getLocationLabel('not-a-real-location' as any)).toBe('not-a-real-location');
  });
});

describe('generateBarcodeSvg', () => {
  it('renders an svg string containing the encoded text', () => {
    const svg = generateBarcodeSvg('SMLOC:galley');
    expect(svg).toContain('<svg');
    expect(svg).toContain('SMLOC:galley');
  });
});

describe('buildLabelHtml', () => {
  it('includes the location label and barcode svg in the printable html', () => {
    const html = buildLabelHtml({ barcode: 'SMLOC:galley', location: 'galley' });
    expect(html).toContain('Galley');
    expect(html).toContain('<svg');
  });

  it('escapes an optional label note to avoid breaking the markup', () => {
    const html = buildLabelHtml({
      barcode: 'SMLOC:galley',
      location: 'galley',
      labelNote: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('svgToDataUrl', () => {
  it('rejects when the image fails to load', async () => {
    class FailingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
    vi.stubGlobal('Image', FailingImage as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await expect(svgToDataUrl('<svg></svg>')).rejects.toThrow(/failed to render/i);

    vi.unstubAllGlobals();
  });
});
