import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Button, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TextField, 
  Select, 
  MenuItem,
  Alert,
  Stack,
  CircularProgress
} from '@mui/material';
import { X, Upload, Save, Trash2, Download } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { ItemCategory, StorageLocation } from '@/types';
import ExcelJS from 'exceljs';

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ImportRow {
  id: string; // temp id for key
  name: string; // Label Name
  nickname: string;
  category: ItemCategory;
  chemicalName: string;
  brand: string;
  container: string;
  vessel: string;
  location: StorageLocation;
  strength: string;
  unitType: string;
  quantity: number;
  remaining: string;
  minQuantity: number;
  scriptName: string;
  dosesLeft: string;
  unitSize: string;
  expirationDate: string;
  notes: string;
  barcode: string;
}

const CATEGORIES: ItemCategory[] = [
  'first-aid', 'medications', 'tools', 'emergency', 
  'hygiene', 'diagnostic', 'ppe', 'other'
];

const LOCATIONS: StorageLocation[] = [
  'head-fore', 'head-aft', 'stbd-cabinet-settee-fore', 
  'stbd-cabinet-settee-aft', 'galley', 'other'
];

export function ExcelImportDialog({ open, onClose }: ExcelImportDialogProps) {
  const [data, setData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0); 
  const cancelImportRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addItem } = useInventory();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`[Import] File selected: ${file.name} (${file.size} bytes)`);
    setIsProcessing(true);
    setError(null);

    try {
      console.log('[Import] Reading file buffer...');
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      
      if (file.name.toLowerCase().endsWith('.csv')) {
         const text = new TextDecoder().decode(buffer);
         const rows = text.split(/\r?\n/).map(row => row.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
         if (rows.length < 2) throw new Error('Invalid CSV file');
         
         const headers = rows[0];
         const jsonData = rows.slice(1).reduce((acc: any[], rowValues) => {
            if (rowValues.length < 1 || (rowValues.length === 1 && !rowValues[0])) return acc;
            const obj: any = {};
            headers.forEach((h, i) => {
                obj[h] = rowValues[i];
            });
            acc.push(obj);
            return acc;
         }, []);
         processJsonData(jsonData);
      } else {
         await workbook.xlsx.load(buffer);
         const worksheet = workbook.worksheets[0];
         if (!worksheet) throw new Error('No worksheet found in file');
         
         const jsonData: any[] = [];
         let headers: string[] = [];

         worksheet.eachRow((row, rowNumber) => {
            const values = row.values as any[];
            if (rowNumber === 1) {
                headers = values.slice(1).map(v => v ? String(v).trim() : '');
            } else {
                const rowObj: any = {};
                headers.forEach((header, idx) => {
                    let val = values[idx + 1];
                    if (val && typeof val === 'object') {
                       // @ts-ignore
                       if (val.text) val = val.text;
                       // @ts-ignore
                       else if (val.result) val = val.result;
                    }
                    rowObj[header] = val;
                });
                jsonData.push(rowObj);
            }
         });
         processJsonData(jsonData);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      setIsProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processJsonData = (jsonData: any[]) => {
      const mappedData: ImportRow[] = jsonData.map((row, index) => ({
        id: `row-${index}-${Date.now()}`,
        name: row['Label Name'] || row['label Name'] || row['Name'] || row['name'] || '',
        nickname: row['Nickname'] || row['nickname'] || '',
        category: validateCategory(row['Category'] || row['category']),
        chemicalName: row['Chemical Name'] || row['chemicalName'] || '',
        brand: row['Brand'] || row['brand'] || '',
        container: row['Container'] || row['container'] || '',
        vessel: row['Vessel'] || row['vessel'] || '',
        location: validateLocation(row['Location'] || row['location']),
        strength: row['Strength'] || row['strength'] || '',
        unitType: row['Unit type'] || row['Unit Type'] || row['unitType'] || '',
        quantity: Number(row['Quantity'] || row['Qty'] || row['quantity']) || 1,
        remaining: row['Remaining'] || row['remaining'] || '',
        minQuantity: Number(row['Min Quantity'] || row['Min'] || row['minQuantity']) || 1,
        scriptName: row['Name on Script'] || row['scriptName'] || '',
        dosesLeft: row['Doses left'] || row['Doses Left'] || row['dosesLeft'] || '',
        unitSize: row['Unit size'] || row['Unit Size'] || row['unitSize'] || '',
        expirationDate: parseDate(row['Expiration'] || row['Expiry'] || row['expirationDate']),
        notes: row['Notes'] || row['notes'] || '',
        barcode: row['Barcode'] || row['barcode'] || ''
      }));

      setData(mappedData);
      setIsProcessing(false);
  };

  const validateCategory = (val: string): ItemCategory => {
    const normalized = (val || '').toLowerCase().trim();
    if (CATEGORIES.includes(normalized as any)) return normalized as ItemCategory;
    return 'other';
  };

  const validateLocation = (val: string): StorageLocation => {
    const normalized = (val || '').toLowerCase().trim().replace(' ', '-');
    if (LOCATIONS.includes(normalized as any)) return normalized as StorageLocation;
    return 'other';
  };

  const parseDate = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    // Simple checks for string formats could be added here
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return '';
  };

  const handleCellChange = (id: string, field: keyof ImportRow, value: any) => {
    setData(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleDeleteRow = (id: string) => {
    setData(prev => prev.filter(row => row.id !== id));
  };

  const handleSave = async () => {
    console.log('[Import] Starting batch import process...');
    setIsProcessing(true);
    setProgress(0);
    cancelImportRef.current = false;
    
    try {
      let count = 0;
      const total = data.filter(row => row.name).length;
      console.log(`[Import] Found ${total} valid items to import.`);
      
      for (const row of data) {
        if (cancelImportRef.current) {
          console.warn('[Import] User cancelled operation.');
          throw new Error('Import cancelled by user');
        }

        if (!row.name) continue; // Skip empty names
        
        console.log(`[Import] Saving item ${count + 1}/${total}: ${row.name} (${row.category})`);
        await addItem({
          name: row.name,
          nickname: row.nickname || undefined,
          category: row.category,
          chemicalName: row.chemicalName || undefined,
          brand: row.brand || undefined,
          container: row.container || undefined,
          vessel: row.vessel || undefined,
          location: row.location,
          strength: row.strength || undefined,
          unitType: row.unitType || undefined,
          quantity: row.quantity,
          remaining: row.remaining || undefined,
          minQuantity: row.minQuantity,
          scriptName: row.scriptName || undefined,
          dosesLeft: row.dosesLeft ? Number(row.dosesLeft) : undefined,
          unitSize: row.unitSize || undefined,
          expirationDate: row.expirationDate || undefined,
          notes: row.notes || undefined,
          barcode: row.barcode || undefined
        });
        count++;
        setProgress(Math.round((count / total) * 100));
      }
      onClose();
      setData([]);
      console.log(`[Import] Successfully imported ${count} items.`);
      alert(`Successfully imported ${count} items.`);
    } catch (err: any) {
      if (err.message === 'Import cancelled by user') {
         setError('Import cancelled. Some items may have been added.');
      } else {
         console.error('[Import] Save error:', err);
         setError('Failed to save items. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      setProgress(0);
      cancelImportRef.current = false;
    }
  };

  const handleCancelProcessing = () => {
    if (confirm('Stop import? Items currently processing will finish, but no new items will be added.')) {
      cancelImportRef.current = true;
    }
  };

  const downloadTemplate = async () => {
    const template = [
      {
        'Nickname': 'PainKiller',
        'Category': 'medications',
        'Label Name': 'Ibuprofen 500mg',
        'Chemical Name': 'Ibuprofen',
        'Brand': 'Advil',
        'Container': 'Bottle',
        'Vessel': 'S/Y Julia',
        'Location': 'galley',
        'Strength': '500mg',
        'Unit type': 'Pill',
        'Quantity': 2,
        'Remaining': '50%',
        'Min Quantity': 1,
        'Name on Script': '',
        'Doses left': 40,
        'Unit size': '100 count',
        'Expiration': '2026-12-31',
        'Notes': 'For mild pain',
        'Barcode': '123456789'
      }
    ];
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    
    // Add Headers
    const headers = Object.keys(template[0]);
    worksheet.addRow(headers);
    
    // Add Data
    const values = Object.values(template[0]);
    worksheet.addRow(values);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stowaway_inventory_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen
      TransitionComponent={undefined}
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <X />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Import Excel Inventory
          </Typography>
          {isProcessing ? (
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">{progress}%</Typography>
                <CircularProgress color="inherit" size={24} value={progress} variant="determinate" />
                <Button color="inherit" onClick={handleCancelProcessing} size="small" variant="outlined">
                  Cancel
                </Button>
             </Box>
          ) : (
            <Button color="inherit" onClick={handleSave} disabled={data.length === 0}>
              Import Items
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, bgcolor: 'background.default', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {data.length === 0 ? (
          <Paper 
            sx={{ 
              p: 6, 
              textAlign: 'center', 
              borderStyle: 'dashed', 
              borderWidth: 2, 
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Upload size={48} className="text-muted-foreground" />
            <Typography variant="h6">Upload Excel or CSV File</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              Drag and drop your file here, or click to browse. Supported formats: .xlsx, .csv
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
               <Button 
                variant="contained" 
                component="label" 
                startIcon={<Upload />}
               >
                 Select File
                 <input 
                   ref={fileInputRef}
                   type="file" 
                   hidden 
                   accept=".xlsx,.csv" 
                   onChange={handleFileChange}
                 />
               </Button>
               
               <Button 
                 variant="outlined" 
                 startIcon={<Download />}
                 onClick={downloadTemplate}
               >
                 Download Template
               </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
             <TableContainer sx={{ flex: 1 }}>
               <Table stickyHeader size="small">
                 <TableHead>
                   <TableRow>
                     <TableCell width={100}>Barcode</TableCell>
                     <TableCell width={150}>Label Name</TableCell>
                     <TableCell width={100}>Nickname</TableCell>
                     <TableCell width={100}>Category</TableCell>
                     <TableCell width={120}>Chemical Name</TableCell>
                     <TableCell width={100}>Brand</TableCell>
                     <TableCell width={100}>Container</TableCell>
                     <TableCell width={100}>Vessel</TableCell>
                     <TableCell width={100}>Location</TableCell>
                     <TableCell width={80}>Strength</TableCell>
                     <TableCell width={80}>Unit Type</TableCell>
                     <TableCell width={60}>Qty</TableCell>
                     <TableCell width={80}>Remaining</TableCell>
                     <TableCell width={60}>Min</TableCell>
                     <TableCell width={120}>Name on Script</TableCell>
                     <TableCell width={80}>Doses Left</TableCell>
                     <TableCell width={80}>Unit Size</TableCell>
                     <TableCell width={120}>Expiration</TableCell>
                     <TableCell width={150}>Notes</TableCell>
                     <TableCell width={50}></TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                   {data.map((row) => (
                     <TableRow key={row.id} hover>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.barcode || ''} 
                           onChange={(e) => handleCellChange(row.id, 'barcode', e.target.value)}
                           placeholder="Scan/Type"
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.name} 
                           onChange={(e) => handleCellChange(row.id, 'name', e.target.value)}
                           error={!row.name}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.nickname} 
                           onChange={(e) => handleCellChange(row.id, 'nickname', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <Select
                           variant="standard"
                           fullWidth
                           value={row.category}
                           onChange={(e) => handleCellChange(row.id, 'category', e.target.value)}
                         >
                           {CATEGORIES.map(c => (
                             <MenuItem key={c} value={c}>{c}</MenuItem>
                           ))}
                         </Select>
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.chemicalName} 
                           onChange={(e) => handleCellChange(row.id, 'chemicalName', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.brand} 
                           onChange={(e) => handleCellChange(row.id, 'brand', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.container} 
                           onChange={(e) => handleCellChange(row.id, 'container', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.vessel} 
                           onChange={(e) => handleCellChange(row.id, 'vessel', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <Select
                           variant="standard"
                           fullWidth
                           value={row.location}
                           onChange={(e) => handleCellChange(row.id, 'location', e.target.value)}
                         >
                           {LOCATIONS.map(l => (
                             <MenuItem key={l} value={l}>{l}</MenuItem>
                           ))}
                         </Select>
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.strength} 
                           onChange={(e) => handleCellChange(row.id, 'strength', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.unitType} 
                           onChange={(e) => handleCellChange(row.id, 'unitType', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           type="number" 
                           value={row.quantity} 
                           onChange={(e) => handleCellChange(row.id, 'quantity', Number(e.target.value))}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.remaining || ''} 
                           onChange={(e) => handleCellChange(row.id, 'remaining', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           type="number" 
                           value={row.minQuantity} 
                           onChange={(e) => handleCellChange(row.id, 'minQuantity', Number(e.target.value))}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.scriptName} 
                           onChange={(e) => handleCellChange(row.id, 'scriptName', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           value={row.dosesLeft} 
                           onChange={(e) => handleCellChange(row.id, 'dosesLeft', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           value={row.unitSize} 
                           onChange={(e) => handleCellChange(row.id, 'unitSize', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           type="date" 
                           fullWidth
                           value={row.expirationDate} 
                           onChange={(e) => handleCellChange(row.id, 'expirationDate', e.target.value)}
                           InputLabelProps={{ shrink: true }}
                         />
                       </TableCell>
                       <TableCell>
                         <TextField 
                           variant="standard" 
                           fullWidth 
                           value={row.notes} 
                           onChange={(e) => handleCellChange(row.id, 'notes', e.target.value)}
                         />
                       </TableCell>
                       <TableCell>
                         <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)}>
                           <Trash2 size={16} />
                         </IconButton>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </TableContainer>
             
             <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                    {data.length} items to import
                </Typography>
                <Button color="error" onClick={() => setData([])}>
                    Clear All
                </Button>
             </Box>
          </Paper>
        )}
      </Box>
    </Dialog>
  );
}
