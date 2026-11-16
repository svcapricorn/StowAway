// Fast cloud label reader (one AI vision call → all form fields).
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem, ItemCategory } from '@/types';

export type ScannedDetails = Partial<Pick<InventoryItem,
  'brand' | 'chemicalName' | 'strength' | 'unitType' | 'unitSize' | 'container' | 'expirationDate' | 'notes'>>;

export interface CloudScanResult {
  name: string;
  category: ItemCategory;
  confidence: number;
  barcode?: string;
  details: ScannedDetails;
}

/** Downscale to keep upload + inference fast; 1024px still keeps small print legible. */
export async function shrinkImage(dataUrl: string, max = 1024, quality = 0.82): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const done = (v: string) => resolve(v);
    const t = setTimeout(() => done(dataUrl), 1000);
    img.onload = () => {
      clearTimeout(t);
      const s = Math.min(1, max / Math.max(img.width, img.height));
      if (s === 1) return done(dataUrl);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const ctx = c.getContext('2d');
      if (!ctx) return done(dataUrl);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      done(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { clearTimeout(t); done(dataUrl); };
    img.src = dataUrl;
  });
}

export async function scanLabelViaCloud(imageData: string): Promise<CloudScanResult | null> {
  try {
    const small = await shrinkImage(imageData);
    const { data, error } = await supabase.functions.invoke('scan-label', { body: { imageData: small } });
    if (error || !data || !data.found || !data.name) return null;
    const notes = [data.lotNumber && `Lot: ${data.lotNumber}`, data.qrText && `QR: ${data.qrText}`]
      .filter(Boolean).join('\n');
    const exp = /^\d{4}-\d{2}-\d{2}$/.test(data.expirationDate || '') ? data.expirationDate : undefined;
    return {
      name: data.name,
      category: data.category,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
      barcode: data.barcode || undefined,
      details: {
        brand: data.brand || undefined,
        chemicalName: data.chemicalName || undefined,
        strength: data.strength || undefined,
        unitType: data.unitType || undefined,
        unitSize: data.unitSize || undefined,
        container: data.container || undefined,
        expirationDate: exp,
        notes: notes || undefined,
      },
    };
  } catch (e) {
    console.error('Cloud label scan failed:', e);
    return null;
  }
}
