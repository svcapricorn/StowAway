// Live preview of a printable inventory label

import React, { useEffect, useRef } from 'react';
import { generateBarcodeSvg, getLocationLabel, type LabelData } from '@/services/barcode';

interface LabelPreviewProps {
  data: LabelData;
}

export function LabelPreview({ data }: LabelPreviewProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barcodeRef.current) return;
    barcodeRef.current.innerHTML = generateBarcodeSvg(data.barcode);
  }, [data.barcode]);

  return (
    <div className="mx-auto w-full max-w-[280px] rounded-lg border border-dashed border-border bg-white p-4 text-center shadow-sm">
      <div ref={barcodeRef} className="w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />
      <p className="mt-3 text-sm font-semibold text-foreground">
        Location: {getLocationLabel(data.location)}
      </p>
      {data.labelNote && (
        <p className="mt-1 text-xs text-muted-foreground">{data.labelNote}</p>
      )}
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">{data.barcode}</p>
    </div>
  );
}
