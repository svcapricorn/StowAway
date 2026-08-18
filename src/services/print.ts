// Label printing: browser print, PDF export, and thermal ESC/POS

import { jsPDF } from 'jspdf';
import {
  buildLabelHtml,
  generateBarcodeSvg,
  getLocationLabel,
  svgToDataUrl,
  type LabelData,
} from './barcode';

/** Open browser print dialog with the label */
export function printLabel(data: LabelData): void {
  const html = buildLabelHtml(data);
  const printWindow = window.open('', '_blank', 'width=400,height=300');
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups to print labels.');
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}

/** Download label as PDF (Avery/sheet label size ~2.25" x 1") */
export async function exportLabelPDF(data: LabelData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [1.25, 2.25],
  });

  const svg = generateBarcodeSvg(data.barcode, 50);
  const imgData = await svgToDataUrl(svg);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 2.25, 1.25, 'F');

  doc.addImage(imgData, 'PNG', 0.15, 0.1, 1.95, 0.55);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Location: ${getLocationLabel(data.location)}`, 1.125, 0.82, { align: 'center' });

  if (data.labelNote) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const truncated = data.labelNote.length > 28 ? `${data.labelNote.slice(0, 25)}...` : data.labelNote;
    doc.text(truncated, 1.125, 1.05, { align: 'center' });
  }

  const filename = `label-${data.barcode}-${getLocationLabel(data.location).replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * Export raw ESC/POS commands for thermal label printers.
 * Compatible with many Brother QL, Zebra, and receipt printers.
 */
export function exportThermal(data: LabelData): void {
  const locationLabel = getLocationLabel(data.location);
  const lines: string[] = [
    `Location: ${locationLabel}`,
  ];
  if (data.labelNote) {
    lines.push(data.labelNote);
  }

  const bytes = buildEscPosLabel(data.barcode, lines);
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/octet-stream' });
  downloadBlob(blob, `label-${data.barcode}.escpos`);
}

function buildEscPosLabel(barcode: string, textLines: string[]): Uint8Array {
  const chunks: number[] = [];

  const append = (...values: number[]) => chunks.push(...values);
  const appendText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      chunks.push(text.charCodeAt(i));
    }
  };

  // Initialize printer
  append(0x1b, 0x40);

  // Center alignment
  append(0x1b, 0x61, 0x01);

  // Code128 barcode (GS k 73 = CODE128 mode B)
  const barcodeBytes = Array.from(barcode).map((c) => c.charCodeAt(0));
  append(0x1d, 0x6b, 0x49, barcodeBytes.length, ...barcodeBytes);

  append(0x0a);

  // Text lines
  append(0x1b, 0x61, 0x01);
  for (const line of textLines) {
    appendText(line);
    append(0x0a);
  }

  // Feed and partial cut (if supported)
  append(0x0a, 0x0a);
  append(0x1d, 0x56, 0x01);

  return new Uint8Array(chunks);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
