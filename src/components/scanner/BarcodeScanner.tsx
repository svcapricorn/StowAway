// SailMed Tracker - Barcode Scanner Component
// Uses device camera to scan barcodes and QR codes

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle, Flashlight } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { 
    Dialog, 
    DialogContent, 
    IconButton, 
    Button, 
    Typography, 
    Box, 
    CircularProgress, 
    Alert 
} from '@mui/material';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function BarcodeScanner({ isOpen, onClose, onScan, title = 'Scan Barcode' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setTorchOn(false);
        return;
    }

    const hints = new Map();
    const formats = [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    setIsInitializing(true);
    setError(null);

    const startScanning = async () => {
      try {
        const videoInputDevices = await reader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError('No camera found on this device');
          setIsInitializing(false);
          return;
        }

        // Prefer back camera
        const backCamera = videoInputDevices.find(
          device => device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('rear')
        );
        const deviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;
        
        console.log(`[BarcodeScanner] Using camera: ${deviceId} (${backCamera ? 'Back' : 'Default'})`);

        await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText();
              console.log(`[BarcodeScanner] Scanned code: ${text}, Format: ${result.getBarcodeFormat()}`);
              
              // Vibrate on successful scan if supported
              if ('vibrate' in navigator) {
                navigator.vibrate(100);
              }
              onScan(text);
              onClose();
            }
            if (err && !(err instanceof NotFoundException)) {
                console.warn('[BarcodeScanner] Decode error (ignoring NotFound):', err);
            }
          }
        );

        // Check if torch is available
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) {
          const track = stream.getVideoTracks()[0];
          // Check torch capability
          const capabilities = track.getCapabilities?.() as any;
          setHasTorch(capabilities?.torch === true);
        }

        setIsInitializing(false);
      } catch (err) {
        console.error('Camera error:', err);
        setError('Unable to access camera. Please check permissions.');
        setIsInitializing(false);
      }
    };

    startScanning();

    return () => {
      if (readerRef.current) {
          readerRef.current.reset();
      }
    };
  }, [isOpen, onScan, onClose]);

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
         advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error('Torch error:', err);
    }
  };

  return (
    <Dialog 
        open={isOpen} 
        onClose={onClose} 
        fullScreen 
        PaperProps={{ 
            sx: { bgcolor: 'black' } 
        }}
        TransitionComponent={undefined} // Use default fade/slide
    >
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              p: 2, 
              zIndex: 10, 
              display: 'flex', 
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
          }}>
              <IconButton onClick={onClose} sx={{ color: 'white' }}>
                  <X />
              </IconButton>
              
              <Typography variant="subtitle1" sx={{ color: 'white', alignSelf: 'center', fontWeight: 500 }}>
                  {title}
              </Typography>

              {hasTorch ? (
                  <IconButton onClick={toggleTorch} sx={{ color: torchOn ? 'warning.main' : 'white' }}>
                      <Flashlight />
                  </IconButton>
              ) : (
                  <Box sx={{ width: 40 }} />
              )}
          </Box>

          {/* Camera View */}
          <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video 
                  ref={videoRef} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Overlay Guidance */}
              {!isInitializing && !error && (
                  <Box sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)',
                      width: '70%',
                      aspectRatio: '1/1',
                      border: '2px solid rgba(255,255,255,0.8)',
                      borderRadius: 4,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                  }}>
                      {/* Scanning Animation Line */}
                      <motion.div
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          style={{ 
                              position: 'absolute', 
                              left: 0, 
                              right: 0, 
                              height: 2, 
                              background: '#3f51b5', // primary color approximate
                              boxShadow: '0 0 4px #3f51b5' 
                          }}
                      />
                  </Box>
              )}

              {isInitializing && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'black', flexDirection: 'column', gap: 2 }}>
                      <CircularProgress sx={{ color: 'white' }} />
                      <Typography color="white">Starting camera...</Typography>
                  </Box>
              )}

              {error && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'black', p: 3 }}>
                      <Alert severity="error" variant="filled" action={
                          <Button color="inherit" size="small" onClick={onClose}>Close</Button>
                      }>
                          {error}
                      </Alert>
                  </Box>
              )}
          </Box>
          
          <Box sx={{ p: 4, textAlign: 'center', color: 'white', background: 'black', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Position the barcode within the frame
              </Typography>
              <Button color="inherit" onClick={onClose}>
                  Enter manually instead
              </Button>
          </Box>
      </Box>
    </Dialog>
  );
}
