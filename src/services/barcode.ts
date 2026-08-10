// Code128 barcodes for storage location labels (personal use)

import JsBarcode from 'jsbarcode';
import { LOCATION_INFO, type StorageLocation } from '@/types';

/** Prefix for location-only barcodes — scan to set/filter by storage location */
export const LOCATION_BARCODE_PREFIX = 'SMLOC:';

export interface LabelData {
  barcode: string;
  location: StorageLocation;
  /** Optional human-readable note printed on the sticker (not encoded in barcode) */
  labelNote?: string;
}

const VALID_LOCATIONS = new Set<string>(Object.keys(LOCATION_INFO));

/** Deterministic barcode for a storage location — reprint anytime, same code */
export function encodeLocationBarcode(location: StorageLocation): string {
  return `${LOCATION_BARCODE_PREFIX}${location}`;
}

/** Parse a scanned value into a storage location, if it is a location barcode */
export function parseLocationBarcode(value: string): StorageLocation | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(LOCATION_BARCODE_PREFIX)) {
    return null;
  }
  const location = trimmed.slice(LOCATION_BARCODE_PREFIX.length);
  if (VALID_LOCATIONS.has(location)) {
    return location as StorageLocation;
  }
  return null;
}

export function isLocationBarcode(value: string): boolean {
  return parseLocationBarcode(value) !== null;
}

/** Render a Code128 barcode as an SVG string */
export function generateBarcodeSvg(text: string, height = 60): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, text, {
    format: 'CODE128',
    width: 2,
    height,
    displayValue: true,
    fontSize: 14,
    margin: 10,
    background: '#ffffff',
    lineColor: '#000000',
  });
  return new XMLSerializer().serializeToString(svg);
}

export function getLocationLabel(location: StorageLocation): string {
  return LOCATION_INFO[location]?.label ?? location;
}

export function buildLabelHtml(data: LabelData): string {
  const svg = generateBarcodeSvg(data.barcode);
  const locationLabel = getLocationLabel(data.location);
  const noteLine = data.labelNote
    ? `<div class="note">${escapeHtml(data.labelNote)}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Label - ${escapeHtml(locationLabel)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #fff;
    }
    .label {
      width: 2.25in;
      padding: 12px;
      border: 1px dashed #ccc;
      text-align: center;
    }
    .barcode { width: 100%; }
    .barcode svg { width: 100%; height: auto; }
    .location {
      margin-top: 8px;
      font-size: 13px;
      font-weight: bold;
    }
    .note {
      margin-top: 4px;
      font-size: 11px;
      color: #333;
    }
    @media print {
      body { min-height: auto; }
      .label { border: none; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="barcode">${svg}</div>
    <div class="location">Location: ${escapeHtml(locationLabel)}</div>
    ${noteLine}
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert SVG string to PNG data URL for PDF export */
export async function svgToDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 300;
      canvas.height = img.height || 80;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render barcode image'));
    };

    img.src = url;
  });
}
