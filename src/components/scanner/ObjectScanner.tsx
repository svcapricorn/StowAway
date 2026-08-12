// StowAway Tracker - Object Scanner Component
// Uses device camera to capture and identify medical supplies

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Flashlight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { 
    Dialog, 
    IconButton, 
    Button, 
    Typography, 
    Box, 
    CircularProgress, 
    Alert,
    Stack
} from '@mui/material';
import { ItemCategory } from '@/types';
import { API_URL, getHeaders } from '@/lib/database';

interface ObjectScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onIdentify: (result: ObjectScanResult) => void;
}

export interface ObjectScanResult {
  name: string;
  category: ItemCategory;
  confidence: number;
  image?: string;
}

const MEDICAL_SUPPLY_PATTERNS: { keywords: string[]; name: string; category: ItemCategory }[] = [
  { keywords: ['bandage', 'band-aid', 'plaster', 'adhesive'], name: 'Adhesive Bandages', category: 'first-aid' },
  { keywords: ['gauze', 'pad', 'dressing'], name: 'Gauze Pads', category: 'first-aid' },
  { keywords: ['tape', 'medical tape', 'surgical tape'], name: 'Medical Tape', category: 'first-aid' },
  { keywords: ['scissors', 'shears'], name: 'Medical Scissors', category: 'tools' },
  { keywords: ['tweezers', 'forceps'], name: 'Tweezers', category: 'tools' },
  { keywords: ['thermometer'], name: 'Thermometer', category: 'diagnostic' },
  { keywords: ['stethoscope'], name: 'Stethoscope', category: 'diagnostic' },
  { keywords: ['syringe', 'needle'], name: 'Syringes', category: 'tools' },
  { keywords: ['ibuprofen', 'advil', 'motrin'], name: 'Ibuprofen', category: 'medications' },
  { keywords: ['aspirin', 'bayer'], name: 'Aspirin', category: 'medications' },
  { keywords: ['acetaminophen', 'tylenol', 'paracetamol'], name: 'Acetaminophen', category: 'medications' },
  { keywords: ['antibiotic', 'neosporin', 'polysporin'], name: 'Antibiotic Ointment', category: 'medications' },
  { keywords: ['antiseptic', 'betadine', 'iodine'], name: 'Antiseptic Solution', category: 'medications' },
  { keywords: ['gloves', 'latex', 'nitrile'], name: 'Medical Gloves', category: 'ppe' },
  { keywords: ['mask', 'face mask', 'surgical mask'], name: 'Face Masks', category: 'ppe' },
  { keywords: ['splint'], name: 'Splint', category: 'first-aid' },
  { keywords: ['tourniquet'], name: 'Tourniquet', category: 'first-aid' },
  { keywords: ['cold pack', 'ice pack'], name: 'Cold Pack', category: 'first-aid' },
  { keywords: ['burn', 'burn gel', 'burn cream'], name: 'Burn Treatment', category: 'first-aid' },
  { keywords: ['eye wash', 'saline'], name: 'Eye Wash Solution', category: 'first-aid' },
];

// Identify a photo server-side so the vision API key never reaches the browser
async function identifyViaBackend(imageData: string): Promise<ObjectScanResult | null> {
  try {
    const headers = await getHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_URL}/vision/identify`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({ imageData }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Vision backend returned non-200 status:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.name && data.category) {
      return {
        name: data.name,
        category: data.category,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.85,
        image: imageData,
      };
    }

    return null;
  } catch (err) {
    console.error('Vision backend request failed:', err);
    return null;
  }
}

export function ObjectScanner({ isOpen, onClose, onIdentify }: ObjectScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [identificationFailed, setIdentificationFailed] = useState(false);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    setCapturedImage(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (err) {
        console.warn('Environment camera not found or access denied, trying fallback.', err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      setHasTorch(capabilities?.torch === true);
      console.log(`[ObjectScanner] Camera started. Torch capability: ${capabilities?.torch === true}`);

      setIsInitializing(false);
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Unable to access camera.');
      }
      setIsInitializing(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  useEffect(() => {
      if (isOpen) {
          startCamera();
      } else {
          stopCamera();
          setCapturedImage(null);
          setIsAnalyzing(false);
          setIdentificationFailed(false);
      }
      return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Re-attach stream when returning to video view
  useEffect(() => {
    if (!capturedImage && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.warn("Resume play failed:", e));
    }
  }, [capturedImage]);

  const toggleTorch = async () => {
     const stream = streamRef.current;
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

  const analyzeImage = useCallback(async (imageData: string) => {
    // setIsAnalyzing(true); // Already set in captureImage
    let result: ObjectScanResult | null = await identifyViaBackend(imageData);

    // Fallback to local OCR (Tesseract) if the backend couldn't identify it
    if (!result) {
         console.log("Using local OCR (Tesseract.js)...");
         try {
             const worker = await createWorker('eng');
             const ret = await worker.recognize(imageData);
             await worker.terminate();
    
             const text = ret.data.text.toLowerCase();
             console.log("OCR Detected Text:", text);
    
             // Simple keyword matching from the extracted text
             const match = MEDICAL_SUPPLY_PATTERNS.find(p => 
                p.keywords.some(k => text.includes(k)) || 
                text.includes(p.name.toLowerCase())
             );
    
             if (match) {
                result = {
                    name: match.name,
                    category: match.category,
                    confidence: 0.8, 
                    image: imageData
                }
             } else if (text.length > 5) {
                 // Fallback: Use the most prominent text lines
                 const lines = ret.data.text.split('\n').filter(l => l.length > 3).slice(0, 2);
                 if (lines.length > 0) {
                     result = {
                         name: lines.join(' ').substring(0, 50),
                         category: 'other',
                         confidence: 0.5,
                         image: imageData
                     }
                 }
             }
         } catch (err) {
             console.error("Local OCR failed:", err);
         }
    }

    if (!result) {
      setIsAnalyzing(false);
      setIdentificationFailed(true);
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(100);

    setIsAnalyzing(false);
    onIdentify(result);
  }, [onIdentify]);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Set loading state explicitly before processing to avoid UI stall feeling
    setIsAnalyzing(true);
    setIdentificationFailed(false);

    // Small delay to allow React to render the loading state before synchronous canvas work
    setTimeout(() => {
        try {
            if (!videoRef.current || !canvasRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Performance optimization: Scale down image for faster API transfer
            // Max 720px is sufficient for text recognition
            const MAX_DIMENSION = 720;
            let width = video.videoWidth;
            let height = video.videoHeight;

            if (width > height) {
            if (width > MAX_DIMENSION) {
                height = Math.round(height * (MAX_DIMENSION / width));
                width = MAX_DIMENSION;
            }
            } else {
            if (height > MAX_DIMENSION) {
                width = Math.round(width * (MAX_DIMENSION / height));
                height = MAX_DIMENSION;
            }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not get canvas context');

            // Draw scaled image
            ctx.drawImage(video, 0, 0, width, height);

            // Reduce quality to 0.6 for better performance/speed
            const imageData = canvas.toDataURL('image/jpeg', 0.6);
            setCapturedImage(imageData);
            
            // Pause video
            video.pause();
            
            analyzeImage(imageData);
        } catch (err) {
            console.error("Capture error:", err);
            setIsAnalyzing(false);
            setError("Failed to capture image. Please try again.");
        }
    }, 50);
  }, [analyzeImage]);

  // Auto-capture when camera is ready
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isOpen && !isInitializing && !capturedImage && !isAnalyzing && !error) {
      // Wait 1.5 seconds and capture automatically
      timeoutId = setTimeout(() => {
         captureImage();
      }, 1500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, isInitializing, capturedImage, isAnalyzing, error, captureImage]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsAnalyzing(false);
    setIdentificationFailed(false);
    // Video playback resumption is handled by the new useEffect
  };

   return (
    <Dialog 
        open={isOpen} 
        onClose={onClose} 
        fullScreen 
        PaperProps={{ 
            sx: { bgcolor: 'black' } 
        }}
        TransitionComponent={undefined}
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
                <IconButton onClick={onClose} sx={{ color: 'white' }} disabled={isAnalyzing}>
                    <X />
                </IconButton>
                
                <Typography variant="subtitle1" sx={{ color: 'white', alignSelf: 'center', fontWeight: 500 }}>
                    Identify Item
                </Typography>

                {hasTorch && !capturedImage ? (
                    <IconButton onClick={toggleTorch} sx={{ color: torchOn ? 'warning.main' : 'white' }}>
                        <Flashlight />
                    </IconButton>
                ) : (
                    <Box sx={{ width: 40 }} />
                )}
            </Box>

            {/* Camera View */}
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {!capturedImage ? (
                   <video 
                        ref={videoRef} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        playsInline
                        muted
                    />
                ) : (
                   <img 
                      src={capturedImage} 
                      alt="Captured" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                   />
                )}
                
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Viewfinder / Guidance */}
                {!capturedImage && !isInitializing && (
                     <Box sx={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        width: '80%',
                        height: '60%',
                        border: '2px solid rgba(255,255,255,0.7)',
                        borderRadius: 3,
                    }}>
                        {/* Crosshair */}
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', width: 8, height: 8, bgcolor: 'secondary.main', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
                    </Box>
                )}

                {isAnalyzing && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)', flexDirection: 'column', gap: 2 }}>
                        <CircularProgress sx={{ color: 'white' }} size={60} />
                        <Typography color="white" fontWeight="bold">Identifying...</Typography>
                    </Box>
                )}

                {isInitializing && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                      <CircularProgress sx={{ color: 'white' }} />
                      <Typography color="white">Starting camera...</Typography>
                  </Box>
                )}

                {error && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.8)', p: 3 }}>
                         <Alert severity="error" variant="filled" action={
                            <Button color="inherit" size="small" onClick={retakePhoto}>Try Again</Button>
                         }>
                            {error}
                        </Alert>
                    </Box>
                )}

                {identificationFailed && !error && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.8)', p: 3 }}>
                        <Stack spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
                            <Alert severity="warning" variant="filled">
                                Couldn't identify this item. Try better lighting, or fill in the details yourself.
                            </Alert>
                            <Button variant="contained" color="secondary" startIcon={<RefreshCw />} onClick={retakePhoto}>
                                Retake Photo
                            </Button>
                            <Button variant="outlined" color="inherit" sx={{ color: 'white', borderColor: 'white' }} onClick={onClose}>
                                Enter Details Manually
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Box>

            {/* Footer / Controls */}
            <Box sx={{ p: 4, bgcolor: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {!capturedImage && !isInitializing ? (
                    <Button 
                        onClick={captureImage}
                        variant="contained" 
                        color="secondary" 
                        size="large"
                        startIcon={<Camera />}
                        fullWidth
                        sx={{ 
                            height: 56, 
                            borderRadius: 2, 
                            fontSize: '1rem', 
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Capture & Identify
                    </Button>
                ) : (capturedImage && !isAnalyzing) ? (
                    <Button 
                        onClick={retakePhoto} 
                        variant="outlined" 
                        color="inherit" 
                        startIcon={<RefreshCw />}
                        sx={{ 
                            color: 'white', 
                            borderColor: 'white', 
                            height: 56, 
                            borderRadius: 2,
                            textTransform: 'none'
                        }}
                        fullWidth
                    >
                        Retake Photo
                    </Button>
                ) : null}
                
                <Typography variant="caption" sx={{ color: 'white', opacity: 0.7 }}>
                  {capturedImage ? 'Analyzing the captured image...' : 'Point camera at the medical supply item'}
                </Typography>
                
                <Button 
                    onClick={onClose} 
                    sx={{ 
                        color: 'white', 
                        opacity: 0.7, 
                        width: '100%',
                        textTransform: 'none' 
                    }}
                >
                  Cancel
                </Button>
            </Box>
        </Box>
    </Dialog>
  );
}