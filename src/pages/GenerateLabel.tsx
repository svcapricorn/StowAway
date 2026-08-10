// Label generator — Code128 location stickers (personal use)

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, FileDown, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LabelPreview } from '@/components/labels/LabelPreview';
import { encodeLocationBarcode, type LabelData } from '@/services/barcode';
import { exportLabelPDF, exportThermal, printLabel } from '@/services/print';
import { toast } from '@/hooks/use-toast';
import { LOCATION_INFO, type StorageLocation } from '@/types';
import {
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
} from '@mui/material';

const ACTIVE_LOCATIONS = Object.entries(LOCATION_INFO).filter(
  ([key]) => !['main-cabin', 'cockpit', 'nav-station', 'forepeak', 'lazarette', 'deck-locker'].includes(key)
);

export default function GenerateLabelPage() {
  const navigate = useNavigate();

  const [location, setLocation] = useState<StorageLocation>('galley');
  const [labelNote, setLabelNote] = useState('');
  const [includeLabelNote, setIncludeLabelNote] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const barcode = useMemo(() => encodeLocationBarcode(location), [location]);

  const labelData: LabelData = {
    barcode,
    location,
    labelNote: includeLabelNote && labelNote.trim() ? labelNote.trim() : undefined,
  };

  const handlePrint = () => {
    try {
      printLabel(labelData);
    } catch (error) {
      toast({
        title: 'Print failed',
        description: error instanceof Error ? error.message : 'Could not open print dialog.',
        variant: 'destructive',
      });
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportLabelPDF(labelData);
      toast({
        title: 'PDF downloaded',
        description: 'Print the file on Avery labels or regular paper.',
      });
    } catch (error) {
      toast({
        title: 'PDF export failed',
        description: error instanceof Error ? error.message : 'Could not create PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportThermal = () => {
    try {
      exportThermal(labelData);
      toast({
        title: 'Thermal file downloaded',
        description: 'Send the .escpos file to your label printer.',
      });
    } catch (error) {
      toast({
        title: 'Thermal export failed',
        description: error instanceof Error ? error.message : 'Could not create thermal file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container space-y-6 py-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Location Labels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Print a sticker for each storage area. Scan it when adding items to set the location automatically.
        </p>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-maritime space-y-4 p-4"
      >
        <TextField
          select
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value as StorageLocation)}
          fullWidth
          required
          helperText="Each location gets one barcode — reprint anytime, same code"
        >
          {ACTIVE_LOCATIONS.map(([value, info]) => (
            <MenuItem key={value} value={value}>
              {info.label}
            </MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={
            <Switch
              checked={includeLabelNote}
              onChange={(e) => setIncludeLabelNote(e.target.checked)}
            />
          }
          label="Add note on sticker (optional)"
        />

        {includeLabelNote && (
          <TextField
            label="Sticker note"
            value={labelNote}
            onChange={(e) => setLabelNote(e.target.value)}
            fullWidth
            placeholder="e.g. Port side, upper shelf"
            helperText="Printed on the label only — not stored in the barcode"
          />
        )}

        <Box className="rounded-md bg-muted/50 p-3">
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Location barcode
          </Typography>
          <Typography variant="body2" className="font-mono">
            {barcode}
          </Typography>
        </Box>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card-maritime p-4"
      >
        <h2 className="mb-4 text-center text-sm font-medium text-muted-foreground">Preview</h2>
        <LabelPreview data={labelData} />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <h2 className="mb-2 px-1 font-semibold text-foreground">Print</h2>

        <PrintAction
          icon={<Printer className="h-5 w-5" />}
          label="Browser Print"
          description="Open print dialog (any printer)"
          onClick={handlePrint}
        />
        <PrintAction
          icon={<FileDown className="h-5 w-5" />}
          label="Download PDF"
          description="For Avery labels or regular paper"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
        />
        <PrintAction
          icon={<Cpu className="h-5 w-5" />}
          label="Download Thermal (ESC/POS)"
          description="Brother QL, Zebra, and similar label printers"
          onClick={handleExportThermal}
        />
      </motion.section>
    </div>
  );
}

interface PrintActionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

function PrintAction({ icon, label, description, onClick, disabled }: PrintActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card-maritime flex w-full items-center gap-4 p-4 text-left transition-all hover:shadow-medium active:scale-[0.99] disabled:opacity-60"
    >
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{label}</div>
        <p className="truncate text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
