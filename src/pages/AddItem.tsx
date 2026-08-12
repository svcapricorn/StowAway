// StowAway Tracker - Add Item Page
// Form for adding new inventory items

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ItemForm } from '@/components/inventory/ItemForm';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { ObjectScanner, ObjectScanResult } from '@/components/scanner/ObjectScanner';
import { Box, Typography } from '@mui/material';
import { parseLocationBarcode } from '@/services/barcode';
import { LOCATION_INFO, StorageLocation } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function AddItemPage() {
  const [searchParams] = useSearchParams();
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'location' | 'product'>('location');
  const [showObjectScanner, setShowObjectScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(searchParams.get('barcode') || undefined);
  const [scannedLocation, setScannedLocation] = useState<StorageLocation | undefined>();
  const [identifiedObject, setIdentifiedObject] = useState<ObjectScanResult | null>(null);

  useEffect(() => {
    if (searchParams.get('barcode')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('barcode');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  const handleScan = (code: string) => {
    const location = parseLocationBarcode(code);
    if (location) {
      setScannedLocation(location);
      toast({
        title: 'Location set',
        description: LOCATION_INFO[location].label,
      });
    } else if (scanMode === 'product') {
      setScannedBarcode(code);
    } else {
      toast({
        title: 'Not a location sticker',
        description: 'Scan a location label (SMLOC:…) or switch to product barcode mode.',
        variant: 'destructive',
      });
      return;
    }
    setShowScanner(false);
  };

  const openLocationScan = () => {
    setScanMode('location');
    setShowScanner(true);
  };

  const openProductScan = () => {
    setScanMode('product');
    setShowScanner(true);
  };

  const handleObjectIdentify = (result: ObjectScanResult) => {
    setIdentifiedObject(result);
    setShowObjectScanner(false);
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Add Item</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add a new item to your medical kit
        </Typography>
      </Box>

      <ItemForm
        onScanLocationRequest={openLocationScan}
        onScanProductBarcodeRequest={openProductScan}
        onScanObjectRequest={() => setShowObjectScanner(true)}
        scannedBarcode={scannedBarcode}
        scannedLocation={scannedLocation}
        identifiedObject={identifiedObject}
      />

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title={scanMode === 'location' ? 'Scan Location' : 'Scan Product Barcode'}
      />

      <ObjectScanner
        isOpen={showObjectScanner}
        onClose={() => setShowObjectScanner(false)}
        onIdentify={handleObjectIdentify}
      />
    </Box>
  );
}
