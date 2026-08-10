// SailMed Tracker - Item Form Component
// Add or edit inventory items

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  Calendar, 
  MapPin, 
  Hash, 
  FileText,
  Scan,
  Save,
  Trash2,
  AlertCircle,
  Camera,
  QrCode,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventory } from '@/context/InventoryContext';
import { CATEGORY_INFO, LOCATION_INFO, ItemCategory, StorageLocation, InventoryItem } from '@/types';
import { 
  TextField, 
  Button, 
  MenuItem, 
  Paper, 
  Typography,
  InputAdornment,
  Grid,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  IconButton
} from '@mui/material';
import { toast } from '@/hooks/use-toast';
import { ObjectScanResult } from '@/components/scanner/ObjectScanner';

interface ItemFormProps {
  existingItem?: InventoryItem;
  onScanLocationRequest?: () => void;
  onScanProductBarcodeRequest?: () => void;
  onScanObjectRequest?: () => void;
  scannedBarcode?: string;
  scannedLocation?: StorageLocation;
  identifiedObject?: ObjectScanResult | null;
}

export function ItemForm({
  existingItem,
  onScanLocationRequest,
  onScanProductBarcodeRequest,
  onScanObjectRequest,
  scannedBarcode,
  scannedLocation,
  identifiedObject,
}: ItemFormProps) {
  const navigate = useNavigate();
  const { addItem, updateItem, deleteItem } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ... (rest of the component logic remains similar, just the render changes)
  const [formData, setFormData] = useState({
    name: existingItem?.name || '',
    nickname: existingItem?.nickname || '',
    category: existingItem?.category || 'first-aid' as ItemCategory,
    chemicalName: existingItem?.chemicalName || '',
    brand: existingItem?.brand || '',
    container: existingItem?.container || '',
    vessel: existingItem?.vessel || '',
    strength: existingItem?.strength || '',
    unitType: existingItem?.unitType || '',
    unitSize: existingItem?.unitSize || '',
    scriptName: existingItem?.scriptName || '',
    dosesLeft: existingItem?.dosesLeft?.toString() || '',
    
    quantity: existingItem?.quantity?.toString() || '1',
    minQuantity: existingItem?.minQuantity?.toString() || '1',
    expirationDate: existingItem?.expirationDate?.split('T')[0] || '',
    location: existingItem?.location || scannedLocation || 'galley' as StorageLocation,
    barcode: existingItem?.barcode || scannedBarcode || '',
    remaining: existingItem?.remaining || '',
    photos: existingItem?.photos || [] as string[],
    notes: existingItem?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set location from scanned location sticker
  useEffect(() => {
    if (scannedLocation) {
      setFormData(prev => ({ ...prev, location: scannedLocation }));
    }
  }, [scannedLocation]);

  // Update product barcode when scanned and lookup retail product name
  useEffect(() => {
    if (scannedBarcode) {
      setFormData(prev => ({ ...prev, barcode: scannedBarcode }));
      
      const fetchProductData = async () => {
        setIsLookingUp(true);
        try {
          // OpenFoodFacts API (Free, no key required)
          const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${scannedBarcode}.json`);
          const data = await response.json();
          
          if (data.status === 1 && data.product) {
            const productName = data.product.product_name || data.product.generic_name;
            if (productName) {
               setFormData(prev => ({ ...prev, name: productName }));
               toast({
                 title: "Product Found",
                 description: `Identified as: ${productName}`,
               });
            }
          }
        } catch (error) {
          console.error("Barcode lookup failed", error);
        } finally {
          setIsLookingUp(false);
        }
      };
      
      fetchProductData();
    }
  }, [scannedBarcode]);

  // Update form when object is identified
  useEffect(() => {
    if (identifiedObject) {
      setFormData(prev => ({
        ...prev,
        name: identifiedObject.name,
        category: identifiedObject.category,
        photos: identifiedObject.image ? [identifiedObject.image, ...prev.photos].slice(0, 20) : prev.photos,
      }));
      toast({
        title: 'Item identified',
        description: `Recognized as "${identifiedObject.name}" (${Math.round(identifiedObject.confidence * 100)}% confidence)`,
      });
    }
  }, [identifiedObject]);

  const handlePhotoAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      if (formData.photos.length >= 20) {
        toast({ title: 'Limit Reached', description: 'Maximum 20 photos allowed.', variant: 'destructive' });
        return;
      }

      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData(prev => ({ ...prev, photos: [...prev.photos, result] }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      newErrors.quantity = 'Quantity must be 0 or more';
    }

    const minQty = parseInt(formData.minQuantity);
    if (isNaN(minQty) || minQty < 0) {
      newErrors.minQuantity = 'Minimum quantity must be 0 or more';
    }

    if (formData.expirationDate) {
      const expDate = new Date(formData.expirationDate);
      if (isNaN(expDate.getTime())) {
        newErrors.expirationDate = 'Invalid date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const itemData: any = {
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || undefined,
        category: formData.category,
        chemicalName: formData.chemicalName.trim() || undefined,
        brand: formData.brand.trim() || undefined,
        container: formData.container.trim() || undefined,
        vessel: formData.vessel.trim() || undefined,
        strength: formData.strength.trim() || undefined,
        unitType: formData.unitType.trim() || undefined,
        unitSize: formData.unitSize.trim() || undefined,
        scriptName: formData.scriptName.trim() || undefined,
        dosesLeft: formData.dosesLeft ? parseFloat(formData.dosesLeft) : undefined,
        
        quantity: parseInt(formData.quantity) || 0,
        minQuantity: parseInt(formData.minQuantity) || 1,
        expirationDate: formData.expirationDate || undefined,
        location: formData.location,
        barcode: formData.barcode.trim() || undefined,
        remaining: formData.remaining.trim() || undefined,
        photos: formData.photos,
        notes: formData.notes.trim() || undefined,
      };

      if (existingItem) {
        await updateItem(existingItem.id, itemData);
        toast({
          title: 'Item updated',
          description: `${itemData.name} has been updated.`,
        });
      } else {
        await addItem(itemData);
        toast({
          title: 'Item added',
          description: `${itemData.name} has been added to your inventory.`,
        });
      }

      navigate('/inventory');
    } catch (err) {
      console.error('Failed to save item:', err);
      toast({
        title: 'Error',
        description: 'Failed to save item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingItem) return;

    setIsSubmitting(true);
    try {
      await deleteItem(existingItem.id);
      toast({
        title: 'Item removed',
        description: `${existingItem.name} has been removed.`,
      });
      navigate('/inventory');
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Scan Options */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Quick Add Options</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onScanLocationRequest}
            sx={{ height: 64, flexDirection: 'column', gap: 1 }}
          >
            <MapPin size={20} />
            <Typography variant="caption">Scan Location</Typography>
          </Button>
          <Button
            variant="outlined"
            onClick={onScanObjectRequest}
            sx={{ height: 64, flexDirection: 'column', gap: 1 }}
          >
            <Camera size={20} />
            <Typography variant="caption">Identify Item</Typography>
          </Button>
        </Box>
        <Button
          variant="text"
          size="small"
          onClick={onScanProductBarcodeRequest}
          startIcon={<QrCode size={16} />}
          sx={{ mt: 1, width: '100%' }}
        >
          Scan retail product barcode (optional)
        </Button>
        {formData.barcode && (
           <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
            Product barcode: {formData.barcode}
           </Typography>
        )}
      </Paper>

      {/* Main Form */}
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">General Info</Typography>
        
        {/* Names */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              id="name"
              label="Label Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bandages, Ibuprofen" // Label name
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                 startAdornment: <InputAdornment position="start"><Package size={18} /></InputAdornment>,
                 endAdornment: isLookingUp ? <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment> : null
              }}
            />
             <TextField
              id="nickname"
              label="Nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              fullWidth
            />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              id="brand"
              label="Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              fullWidth
            />
            <TextField
              id="vessel"
              label="Vessel"
              value={formData.vessel}
              onChange={(e) => setFormData({ ...formData, vessel: e.target.value })}
              fullWidth
            />
        </Box>

        <TextField
            id="chemicalName"
            label="Chemical Name"
            value={formData.chemicalName}
            onChange={(e) => setFormData({ ...formData, chemicalName: e.target.value })}
            fullWidth
            placeholder="e.g. Ibuprofen, Paracetamol"
        />

        {/* Category */}
        <TextField
          select
          label="Category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
          fullWidth
        >
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <MenuItem key={key} value={key}>
              {info.label}
            </MenuItem>
          ))}
        </TextField>

        <Typography variant="h6" sx={{ mt: 1 }}>Details & Dosage</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
             <TextField
              id="strength"
              label="Strength"
              value={formData.strength}
              onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
              placeholder="e.g. 500mg"
              fullWidth
            />
             <TextField
              id="unitType"
              label="Unit Type"
              value={formData.unitType}
              onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
              placeholder="e.g. Tablet, ml"
              fullWidth
            />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
             <TextField
              id="container"
              label="Container"
              value={formData.container}
              onChange={(e) => setFormData({ ...formData, container: e.target.value })}
              placeholder="e.g. Bottle, Box"
              fullWidth
            />
             <TextField
              id="unitSize"
              label="Unit Size"
              value={formData.unitSize}
              onChange={(e) => setFormData({ ...formData, unitSize: e.target.value })}
              placeholder="e.g. 100 count"
              fullWidth
            />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
             <TextField
              id="scriptName"
              label="Name on Script"
              value={formData.scriptName}
              onChange={(e) => setFormData({ ...formData, scriptName: e.target.value })}
              fullWidth
            />
             <TextField
              id="dosesLeft"
              label="Doses Left"
              type="number"
              value={formData.dosesLeft}
              onChange={(e) => setFormData({ ...formData, dosesLeft: e.target.value })}
              fullWidth
            />
        </Box>

        <Typography variant="h6" sx={{ mt: 1 }}>Inventory Control</Typography>

        {/* Quantity Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              id="quantity"
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              error={!!errors.quantity}
              helperText={errors.quantity}
              InputProps={{
                 startAdornment: <InputAdornment position="start"><Hash size={18} /></InputAdornment>,
              }}
            />
            <TextField
              id="minQuantity"
              label="Min. Stock"
              type="number"
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
              error={!!errors.minQuantity}
              helperText={errors.minQuantity}
            />
        </Box>

        {/* Remaining in Open Unit */}
        <TextField
            id="remaining"
            label="Amount Left (e.g. 50%, ~10 pills)"
            value={formData.remaining}
            onChange={(e) => setFormData({ ...formData, remaining: e.target.value })}
            fullWidth
            helperText="Track usage of the current open unit"
        />

        {/* Expiration Date */}
        <TextField
            id="expirationDate"
            label="Expiration Date"
            type="date"
            fullWidth
            value={formData.expirationDate}
            onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
            error={!!errors.expirationDate}
            helperText={errors.expirationDate}
            InputLabelProps={{ shrink: true }}
            InputProps={{
                 startAdornment: <InputAdornment position="start"><Calendar size={18} /></InputAdornment>,
            }}
        />

        {/* Location */}
        <TextField
          select
          label="Storage Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value as StorageLocation })}
          fullWidth
          InputProps={{
             startAdornment: <InputAdornment position="start"><MapPin size={18} /></InputAdornment>,
          }}
        >
          {Object.entries(LOCATION_INFO).map(([key, info]) => (
            <MenuItem key={key} value={key}>
              {info.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Photos */}
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Photos ({formData.photos.length}/20)</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 1, mb: 2 }}>
                {formData.photos.map((photo, index) => (
                    <Box key={index} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                        <img src={photo} alt={`Item ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <IconButton 
                            size="small" 
                            onClick={() => handlePhotoRemove(index)}
                            sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', padding: 0.5, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                        >
                            <X size={12} />
                        </IconButton>
                    </Box>
                ))}
                
                {formData.photos.length < 20 && (
                    <Button
                        component="label"
                        variant="outlined"
                        sx={{ 
                            aspectRatio: '1', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            textTransform: 'none',
                            borderStyle: 'dashed'
                        }}
                    >
                        <Camera size={24} />
                        <Typography variant="caption" sx={{ mt: 0.5 }}>Add</Typography>
                        <input
                            type="file"
                            hidden
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoAdd}
                        />
                    </Button>
                )}
            </Box>
        </Box>

        {/* Notes */}
        <TextField
            id="notes"
            label="Notes (Optional)"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            fullWidth
             InputProps={{
                 startAdornment: <InputAdornment position="start" sx={{alignSelf: 'flex-start', mt: 1}}><FileText size={18} /></InputAdornment>,
            }}
        />
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            fullWidth
            disabled={isSubmitting}
            sx={{ height: 48 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            disabled={isSubmitting}
            startIcon={<Save />}
            sx={{ height: 48 }}
          >
            {isSubmitting ? 'Saving...' : existingItem ? 'Update Item' : 'Add Item'}
          </Button>
        </Box>

        {existingItem && (
          <Button
            variant="text"
            color="error"
            onClick={() => setShowDeleteConfirm(true)}
            fullWidth
            startIcon={<Trash2 />}
            disabled={isSubmitting}
          >
            Remove Item
          </Button>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Remove this item?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{existingItem?.name}" will be permanently removed from your inventory.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" autoFocus disabled={isSubmitting}>
            {isSubmitting ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
