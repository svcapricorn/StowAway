// StowAway Tracker - Inventory Page
// Full inventory list with filtering

import React, { Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InventoryList } from '@/components/inventory/InventoryList';
import { QuickAddDialog } from '@/components/inventory/QuickAddDialog';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { Box, Typography, Button, Stack } from '@mui/material';
import { FileSpreadsheet, MapPin } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { InventoryItem, LOCATION_INFO } from '@/types';
import { parseLocationBarcode } from '@/services/barcode';
import { toast } from '@/hooks/use-toast';

// exceljs is heavy and only needed once the import dialog is actually opened
const ExcelImportDialog = lazy(() =>
  import('@/components/inventory/ExcelImportDialog').then(m => ({ default: m.ExcelImportDialog }))
);

export default function InventoryPage() {
  const [, setSearchParams] = useSearchParams();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [quickAddState, setQuickAddState] = useState<{ open: boolean; item?: InventoryItem; barcode?: string }>({ open: false });
  
  const { items, updateItem } = useInventory();

  const handleScan = (code: string) => {
    const location = parseLocationBarcode(code);
    if (location) {
      setSearchParams({ location });
      toast({
        title: 'Location scanned',
        description: `Showing items in ${LOCATION_INFO[location].label}`,
      });
      return;
    }

    // Retail product barcode on an existing item (secondary use)
    const found = items.find(i => i.barcode === code);
    if (found) {
      setQuickAddState({ open: true, item: found, barcode: code });
      return;
    }

    toast({
      title: 'Unknown barcode',
      description: 'Scan a location sticker (SMLOC:…) or a product barcode linked to an item.',
      variant: 'destructive',
    });
  };

  const handleConfirmAdd = async (id: string, amount: number) => {
    const item = items.find(i => i.id === id);
    if (item) {
       await updateItem(id, { quantity: item.quantity + amount });
       toast({ title: 'Stock Updated', description: `Added ${amount} to ${item.name}` });
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
            <Typography variant="h5" fontWeight="bold">Inventory</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All your medical supplies in one place
            </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button 
                variant="contained" 
                color="secondary"
                startIcon={<MapPin size={18} />}
                onClick={() => setIsScannerOpen(true)}
            >
                Scan Location
            </Button>
            <Button 
                variant="outlined" 
                startIcon={<FileSpreadsheet size={18} />}
                onClick={() => setIsImportOpen(true)}
            >
                Import Excel
            </Button>
        </Stack>
      </Stack>

      <InventoryList />

      {isImportOpen && (
        <Suspense fallback={null}>
          <ExcelImportDialog
            open={isImportOpen}
            onClose={() => setIsImportOpen(false)}
          />
        </Suspense>
      )}
      
      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan}
        title="Scan Location"
      />
      
      <QuickAddDialog 
        open={quickAddState.open} 
        onClose={() => setQuickAddState({ ...quickAddState, open: false })}
        item={quickAddState.item}
        scannedBarcode={quickAddState.barcode}
        onConfirmAdd={handleConfirmAdd}
      />
    </Box>
  );
}
