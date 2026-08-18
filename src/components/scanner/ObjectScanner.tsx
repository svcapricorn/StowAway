// StowAway Tracker - Object Scanner Component
// Uses device camera to capture and identify medical supplies

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Flashlight, Loader2, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';
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
  /** UPC/EAN barcode read from the item's packaging, if one was visible */
  barcode?: string;
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

// Identify a photo server-side so the vision API key never reaches the browser.
// The vision round-trip can legitimately take ~20s on a slow link; the previous
// 15s abort cut it off and silently fell back to the much weaker on-device OCR.
async function identifyViaBackend(imageData: string): Promise<ObjectScanResult | null> {
  try {
    const headers = await getHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

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

// Barcode formats worth checking on a still photo (product/UPC codes, not location stickers)
const barcodeHints = new Map();
barcodeHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
]);
barcodeHints.set(DecodeHintType.TRY_HARDER, true);
const barcodeReader = new BrowserMultiFormatReader(barcodeHints);

// Load a data URL into an <img> so it can be redrawn/preprocessed on a canvas
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Boost contrast and convert to grayscale, upscaled 2x — Tesseract reads printed
// labels far more reliably on a high-contrast, larger image than on a raw photo.
async function preprocessForOcr(imageData: string): Promise<string> {
  try {
    const img = await loadImage(imageData);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return imageData;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = frame.data;

    // Pass 1: grayscale + collect min/max for a contrast stretch
    let min = 255;
    let max = 0;
    for (let i = 0; i < px.length; i += 4) {
      const gray = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
      px[i] = px[i + 1] = px[i + 2] = gray;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }

    // Pass 2: stretch the histogram so faint print separates from packaging
    const range = Math.max(1, max - min);
    for (let i = 0; i < px.length; i += 4) {
      const stretched = Math.max(0, Math.min(255, ((px[i] - min) / range) * 255));
      px[i] = px[i + 1] = px[i + 2] = stretched;
    }

    ctx.putImageData(frame, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('OCR preprocessing failed, using original image:', err);
    return imageData;
  }
}

// Look for a UPC/EAN barcode in the captured still photo so items can be identified
// by the printed barcode, not only by the picture of the item itself.
// Retried against a contrast-boosted copy because glossy packaging often defeats
// the first pass.
async function detectBarcode(imageData: string): Promise<string | null> {
  const attempt = async (src: string) => {
    try {
      const result = await barcodeReader.decodeFromImageUrl(src);
      return result.getText();
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        console.warn('Barcode detection error:', err);
      }
      return null;
    }
  };

  const direct = await attempt(imageData);
  if (direct) return direct;

  const enhanced = await preprocessForOcr(imageData);
  return enhanced === imageData ? null : attempt(enhanced);
}


// Look up a scanned barcode against a free public product database
async function lookupBarcodeName(barcode: string): Promise<{ name: string; category: ItemCategory } | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    const productName: string | undefined = data?.product?.product_name || data?.product?.generic_name;

    if (data?.status !== 1 || !productName) {
      return null;
    }

    const lowerName = productName.toLowerCase();
    const match = MEDICAL_SUPPLY_PATTERNS.find(p =>
      p.keywords.some(k => lowerName.includes(k)) || lowerName.includes(p.name.toLowerCase())
    );

    return { name: productName, category: match?.category ?? 'other' };
  } catch (err) {
    console.warn('Barcode product lookup failed:', err);
    return null;
  }
}

export function ObjectScanner({ isOpen, onClose, onIdentify }: ObjectScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [identificationFailed, setIdentificationFailed] = useState(false);
  const [pendingResult, setPendingResult] = useState<ObjectScanResult | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string | null>(null);


  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    setCapturedImage(null);

    try {
      let stream: MediaStream;
      try {
        // Request a high-resolution stream: small labels and dosages are
        // unreadable at 1280x720 once the photo is compressed.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // Prefer back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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

      // Continuous autofocus keeps close-up label text sharp; ignored where unsupported.
      try {
        const advanced: MediaTrackConstraintSet[] = [];
        if (capabilities?.focusMode?.includes?.('continuous')) {
          advanced.push({ focusMode: 'continuous' } as any);
        }
        if (advanced.length) await track.applyConstraints({ advanced } as any);
      } catch (focusErr) {
        console.warn('Could not apply focus constraints:', focusErr);
      }

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
          setPendingResult(null);
          setIsHolding(false);
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
    // Run the local barcode read and the server vision call together — the
    // barcode pass used to block the vision request and add seconds of latency.
    setAnalysisStage('Reading label and barcode…');
    const [barcode, visionResult] = await Promise.all([
      detectBarcode(imageData),
      identifyViaBackend(imageData),
    ]);

    let result: ObjectScanResult | null = visionResult;

    // A barcode is an exact product identifier, so trust a successful lookup
    // over a low-confidence vision guess.
    if (barcode && (!result || result.confidence < 0.6)) {
      setAnalysisStage('Looking up barcode…');
      const productMatch = await lookupBarcodeName(barcode);
      if (productMatch) {
        result = {
          name: productMatch.name,
          category: productMatch.category,
          confidence: 0.9,
          image: imageData,
        };
      }
    }

    // Last resort: on-device OCR against a contrast-boosted copy of the photo
    if (!result) {
      setAnalysisStage('Reading text on the package…');
      try {
        const ocrImage = await preprocessForOcr(imageData);
        const worker = await createWorker('eng');
        const ret = await worker.recognize(ocrImage);
        await worker.terminate();

        const rawText = ret.data.text;
        const text = rawText.toLowerCase();
        console.log('OCR Detected Text:', text);

        const match = MEDICAL_SUPPLY_PATTERNS.find(p =>
          p.keywords.some(k => text.includes(k)) ||
          text.includes(p.name.toLowerCase())
        );

        if (match) {
          result = {
            name: match.name,
            category: match.category,
            confidence: 0.8,
            image: imageData,
          };
        } else {
          // Pick the most product-name-like line rather than blindly joining the
          // first two lines (which often grabs legal text or barcode digits).
          const candidates = rawText
            .split('\n')
            .map(l => l.replace(/[^A-Za-z0-9%.\-+/ ]/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(l => l.length >= 4 && /[A-Za-z]{3}/.test(l) && !/^\d+$/.test(l));

          const scored = candidates
            .map(line => {
              const letters = (line.match(/[A-Za-z]/g) || []).length;
              const upper = (line.match(/[A-Z]/g) || []).length;
              // Favour longer, largely-uppercase lines: that's how brand and
              // product names are printed on packaging.
              return { line, score: letters + upper * 1.5 - Math.abs(line.length - 24) };
            })
            .sort((a, b) => b.score - a.score);

          if (scored.length > 0) {
            result = {
              name: scored[0].line.substring(0, 60),
              category: 'other',
              confidence: 0.45,
              image: imageData,
            };
          }
        }
      } catch (err) {
        console.error('Local OCR failed:', err);
      }
    }

    if (barcode && result) {
      result = { ...result, barcode };
    }

    setAnalysisStage(null);

    if (!result) {
      setIsAnalyzing(false);
      setIdentificationFailed(true);
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(100);

    setIsAnalyzing(false);
    // Hold for the user to confirm this is the right item before finalizing
    setPendingResult(result);
  }, []);


  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Set loading state explicitly before processing to avoid UI stall feeling
    setIsAnalyzing(true);
    setIdentificationFailed(false);
    setPendingResult(null);
    setIsHolding(false);

    // Small delay to allow React to render the loading state before synchronous canvas work
    setTimeout(() => {
        try {
            if (!videoRef.current || !canvasRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // 720px + quality 0.6 lost the small print (dosages, strengths) that
            // identification depends on. 1440px at quality 0.9 keeps labels legible
            // and is still comfortably inside the vision API's size limits.
            const MAX_DIMENSION = 1440;
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

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, 0, 0, width, height);

            const imageData = canvas.toDataURL('image/jpeg', 0.9);

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

  // Auto-capture once the phone stops moving, instead of on a fixed timer.
  // Samples the video onto a tiny hidden canvas a few times a second and compares
  // frames; once several samples in a row are nearly identical, the device is
  // considered "still" and we take the photo. A max-wait fallback guarantees a
  // capture still happens even if the frame never fully settles.
  useEffect(() => {
    if (!isOpen || isInitializing || capturedImage || isAnalyzing || error) {
      setIsHolding(false);
      return;
    }

    const SETTLE_MS = 1500; // give the user time to bring the item into frame before watching for stillness
    const STILL_THRESHOLD = 6; // average per-pixel diff (0-255) below this counts as "still"
    const STILL_SAMPLES_REQUIRED = 4; // consecutive still samples before capturing
    const SAMPLE_INTERVAL_MS = 150;
    const MAX_WAIT_MS = 4000;

    let lastFrame: Uint8ClampedArray | null = null;
    let stillCount = 0;
    let cancelled = false;
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const sampleCanvas = motionCanvasRef.current;
    const ctx = sampleCanvas?.getContext('2d', { willReadFrequently: true });

    const settleTimer = setTimeout(() => {
      if (cancelled) return;

      maxWaitTimer = setTimeout(() => {
        if (!cancelled) captureImage();
      }, MAX_WAIT_MS);

      intervalId = setInterval(() => {
        const video = videoRef.current;
        if (!video || !sampleCanvas || !ctx || video.readyState < 2) return;

        ctx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const frame = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;

        if (lastFrame) {
          let diffTotal = 0;
          for (let i = 0; i < frame.length; i += 4) {
            diffTotal += Math.abs(frame[i] - lastFrame[i]);
          }
          const avgDiff = diffTotal / (frame.length / 4);

          if (avgDiff < STILL_THRESHOLD) {
            stillCount += 1;
            setIsHolding(true);
          } else {
            stillCount = 0;
            setIsHolding(false);
          }

          if (stillCount >= STILL_SAMPLES_REQUIRED) {
            cancelled = true;
            clearTimeout(maxWaitTimer);
            clearInterval(intervalId);
            captureImage();
            return;
          }
        }

        lastFrame = frame;
      }, SAMPLE_INTERVAL_MS);
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isInitializing, capturedImage, isAnalyzing, error, captureImage]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsAnalyzing(false);
    setIdentificationFailed(false);
    setPendingResult(null);
    setIsHolding(false);
    setAnalysisStage(null);
    // Video playback resumption is handled by the new useEffect
  };


  // User confirmed the identified item is correct — hand the result back to the caller
  const confirmIdentification = () => {
    if (pendingResult) {
      onIdentify(pendingResult);
    }
  };

   return (
    <Dialog 
        open={isOpen} 
        onClose={onClose} 
        fullScreen 
        aria-labelledby="object-scanner-title"
        PaperProps={{ 
            sx: { bgcolor: 'black' } 
        }}
        TransitionComponent={undefined}
    >
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
             {/* Header */}
             <Box
                component="header"
                sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                p: 2, 
                zIndex: 10, 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)'
            }}>
                <IconButton
                    onClick={onClose}
                    aria-label="Close scanner"
                    disabled={isAnalyzing}
                    sx={{ color: 'common.white', minWidth: 48, minHeight: 48 }}
                >
                    <X aria-hidden="true" />
                </IconButton>
                
                <Typography
                    id="object-scanner-title"
                    component="h2"
                    variant="subtitle1"
                    sx={{ color: 'common.white', fontWeight: 600 }}
                >
                    Identify Item
                </Typography>

                {hasTorch && !capturedImage ? (
                    <IconButton
                        onClick={toggleTorch}
                        aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                        aria-pressed={torchOn}
                        sx={{ color: torchOn ? 'warning.main' : 'common.white', minWidth: 48, minHeight: 48 }}
                    >
                        <Flashlight aria-hidden="true" />
                    </IconButton>
                ) : (
                    <Box sx={{ width: 48 }} />
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
                        aria-label="Live camera view for identifying an item"
                    />
                ) : (
                   <img 
                      src={capturedImage} 
                      alt="Photo you just captured of the item being identified" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                   />
                )}
                
                <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'none' }} />
                <canvas ref={motionCanvasRef} aria-hidden="true" width={32} height={24} style={{ display: 'none' }} />

                {/* Viewfinder / Guidance */}
                {!capturedImage && !isInitializing && (
                     <Box aria-hidden="true" sx={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        width: '80%',
                        height: '60%',
                        border: '2px solid',
                        borderColor: isHolding ? 'success.main' : 'rgba(255,255,255,0.7)',
                        borderRadius: 3,
                        transition: 'border-color 0.2s ease',
                    }}>
                        {/* Crosshair */}
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', width: 8, height: 8, bgcolor: 'secondary.main', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
                    </Box>
                )}

                {isAnalyzing && (
                    <Box role="status" aria-live="polite" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.55)', flexDirection: 'column', gap: 2 }}>
                        <CircularProgress aria-hidden="true" sx={{ color: 'common.white' }} size={60} />
                        <Typography sx={{ color: 'common.white' }} fontWeight="bold">
                            {analysisStage ?? 'Identifying…'}
                        </Typography>
                    </Box>
                )}


                {isInitializing && (
                  <Box role="status" aria-live="polite" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                      <CircularProgress aria-hidden="true" sx={{ color: 'common.white' }} />
                      <Typography sx={{ color: 'common.white' }}>Starting camera…</Typography>
                  </Box>
                )}

                {error && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.85)', p: 3 }}>
                         <Alert role="alert" severity="error" variant="filled" action={
                            <Button color="inherit" size="small" onClick={retakePhoto} sx={{ minHeight: 44 }}>Try Again</Button>
                         }>
                            {error}
                        </Alert>
                    </Box>
                )}

                {identificationFailed && !error && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.85)', p: 3 }}>
                        <Stack spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
                            <Alert role="alert" severity="warning" variant="filled">
                                Couldn't identify this item. Try better lighting, move closer to the label, or fill in the details yourself.
                            </Alert>
                            <Button variant="contained" color="secondary" startIcon={<RefreshCw aria-hidden="true" />} onClick={retakePhoto} sx={{ minHeight: 48 }}>
                                Retake Photo
                            </Button>
                            <Button variant="outlined" onClick={onClose} sx={{ minHeight: 48, color: 'common.white', borderColor: 'common.white' }}>
                                Enter Details Manually
                            </Button>
                        </Stack>
                    </Box>
                )}

                {/* Confirm the identified item before handing it back to the form */}
                {pendingResult && !isAnalyzing && (
                    <Box
                        role="region"
                        aria-live="polite"
                        aria-labelledby="scan-confirm-heading"
                        sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.6)', p: 3 }}
                    >
                        <Stack spacing={2} sx={{ width: '100%', maxWidth: 400, bgcolor: 'background.paper', borderRadius: 3, p: 3, mb: 2 }}>
                            <Typography id="scan-confirm-heading" component="h3" variant="overline" color="text.secondary">Is this correct?</Typography>
                            <Typography variant="h6" fontWeight={700}>{pendingResult.name || 'Unnamed item'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {pendingResult.category} • {Math.round(pendingResult.confidence * 100)}% confidence
                                {pendingResult.barcode ? ` • Barcode ${pendingResult.barcode}` : ''}
                            </Typography>
                            <Stack direction="row" spacing={1.5}>
                                <Button variant="outlined" startIcon={<RefreshCw aria-hidden="true" />} onClick={retakePhoto} fullWidth sx={{ minHeight: 48 }}>
                                    No, Retake
                                </Button>
                                <Button variant="contained" color="success" startIcon={<Check aria-hidden="true" />} onClick={confirmIdentification} fullWidth sx={{ minHeight: 48 }}>
                                    Yes, That's It
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                )}
            </Box>

            {/* Footer / Controls */}
            <Box sx={{ p: 4, bgcolor: 'common.black', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {!capturedImage && !isInitializing ? (
                    <Button 
                        onClick={captureImage}
                        variant="contained" 
                        color="secondary" 
                        size="large"
                        startIcon={<Camera aria-hidden="true" />}
                        fullWidth
                        sx={{ 
                            minHeight: 56, 
                            borderRadius: 2, 
                            fontSize: '1rem', 
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Capture & Identify
                    </Button>
                ) : (capturedImage && !isAnalyzing && !pendingResult && !identificationFailed) ? (
                    <Button 
                        onClick={retakePhoto} 
                        variant="outlined" 
                        startIcon={<RefreshCw aria-hidden="true" />}
                        sx={{ 
                            color: 'common.white', 
                            borderColor: 'common.white', 
                            minHeight: 56, 
                            borderRadius: 2,
                            textTransform: 'none'
                        }}
                        fullWidth
                    >
                        Retake Photo
                    </Button>
                ) : null}
                
                <Typography
                    variant="caption"
                    role="status"
                    aria-live="polite"
                    sx={{ color: 'common.white' }}
                >
                  {pendingResult
                    ? 'Confirm the item above'
                    : capturedImage
                    ? analysisStage ?? 'Analyzing the captured image…'
                    : isHolding
                    ? 'Hold still… capturing'
                    : 'Point camera at the item label and hold steady'}
                </Typography>
                
                <Button 
                    onClick={onClose} 
                    sx={{ 
                        color: 'common.white', 
                        width: '100%',
                        minHeight: 48,
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