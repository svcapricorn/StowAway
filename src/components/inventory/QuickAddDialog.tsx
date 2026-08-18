import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  TextField, 
  IconButton,
  Avatar
} from '@mui/material';
import { Minus, Plus, Package, AlertCircle, ArrowRight } from 'lucide-react';
import { InventoryItem, CATEGORY_INFO } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '@/context/InventoryContext';

interface QuickAddDialogProps {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem;
  scannedBarcode?: string;
  onConfirmAdd: (id: string, amount: number) => Promise<void>;
}

export function QuickAddDialog({ open, onClose, item, scannedBarcode, onConfirmAdd }: QuickAddDialogProps) {
  const [addAmount, setAddAmount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setAddAmount(1);
    }
  }, [open]);

  const handleIncrement = () => setAddAmount(prev => prev + 1);
  const handleDecrement = () => setAddAmount(prev => Math.max(1, prev - 1));

  const handleConfirm = async () => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await onConfirmAdd(item.id, addAmount);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = () => {
    navigate(`/add?barcode=${scannedBarcode}`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {item ? (
        <>
          <DialogTitle>Add Stock</DialogTitle>
          <DialogContent>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}>
                   <Package color="white" />
                </Avatar>
                <Box>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                     Current Quantity: <strong>{item.quantity}</strong> {item.remaining ? `(${item.remaining})` : ''}
                  </Typography>
                </Box>
             </Box>
             
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 4 }}>
               <IconButton 
                 onClick={handleDecrement} 
                 aria-label="Decrease amount to add"
                 sx={{ border: 1, borderColor: 'divider', minWidth: 48, minHeight: 48 }}
               >
                 <Minus aria-hidden="true" />
               </IconButton>
               
               <TextField 
                 value={addAmount}
                 onChange={(e) => setAddAmount(Math.max(1, parseInt(e.target.value) || 0))}
                 type="number"
                 label="Amount to add"
                 sx={{ width: 120, textAlign: 'center' }}
                 inputProps={{ style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }, min: 1 }}
               />
               
               <IconButton 
                 onClick={handleIncrement} 
                 aria-label="Increase amount to add"
                 sx={{ border: 1, borderColor: 'divider', minWidth: 48, minHeight: 48, bgcolor: 'primary.light', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.main' } }}
               >
                 <Plus aria-hidden="true" />
               </IconButton>

             </Box>
             
             <Typography variant="body2" color="text.secondary" align="center">
                New Quantity will be: <strong>{item.quantity + addAmount}</strong>
             </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button onClick={handleConfirm} variant="contained" disabled={isSubmitting}>
               {isSubmitting ? 'Updating...' : 'Add Stock'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
           <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
              <AlertCircle size={24} /> Item Not Found
           </DialogTitle>
           <DialogContent>
              <Typography>
                 No item found with barcode <strong>{scannedBarcode}</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                 Would you like to create a new item with this barcode?
              </Typography>
           </DialogContent>
           <DialogActions>
             <Button onClick={onClose} color="inherit">Cancel</Button>
             <Button onClick={handleCreateNew} variant="contained" endIcon={<ArrowRight size={16} />}>
                Create New Item
             </Button>
           </DialogActions>
        </>
      )}
    </Dialog>
  );
}
