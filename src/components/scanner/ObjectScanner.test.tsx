import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObjectScanner } from './ObjectScanner';

vi.mock('@/lib/database', () => ({
  API_URL: 'http://localhost:3001/api/inventory',
  getHeaders: vi.fn().mockResolvedValue({ 'Content-Type': 'application/json' }),
}));

const { decodeFromImageUrlMock, recognizeMock, terminateMock } = vi.hoisted(() => ({
  decodeFromImageUrlMock: vi.fn(),
  recognizeMock: vi.fn(),
  terminateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: class {
    decodeFromImageUrl(url?: string) {
      return decodeFromImageUrlMock(url);
    }
  },
  NotFoundException: class NotFoundException extends Error {},
  BarcodeFormat: { UPC_A: 0, UPC_E: 1, EAN_13: 2, EAN_8: 3, CODE_128: 4 },
  DecodeHintType: { POSSIBLE_FORMATS: 0 },
}));

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({ recognize: recognizeMock, terminate: terminateMock }),
}));

function mockCameraDom() {
  const fakeCtx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(32 * 24 * 4) })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as any);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,fakeimage');
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { value: 4, configurable: true });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { value: 640, configurable: true });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { value: 480, configurable: true });
}

function mockGetUserMedia() {
  (navigator as any).mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getVideoTracks: () => [{ getCapabilities: () => ({ torch: false }), applyConstraints: vi.fn() }],
      getTracks: () => [{ stop: vi.fn() }],
    }),
  };
}

describe('ObjectScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a permission-denied message when camera access is refused', async () => {
    const deniedError = new DOMException('denied', 'NotAllowedError');
    (navigator as any).mediaDevices = { getUserMedia: vi.fn().mockRejectedValue(deniedError) };

    render(<ObjectScanner isOpen onClose={vi.fn()} onIdentify={vi.fn()} />);

    expect(await screen.findByText(/camera permission denied/i)).toBeInTheDocument();
  });

  it('shows a no-camera message when no device is found', async () => {
    const notFoundError = new DOMException('not found', 'NotFoundError');
    (navigator as any).mediaDevices = { getUserMedia: vi.fn().mockRejectedValue(notFoundError) };

    render(<ObjectScanner isOpen onClose={vi.fn()} onIdentify={vi.fn()} />);

    expect(await screen.findByText(/no camera found/i)).toBeInTheDocument();
  });

  it('does not request the camera while closed', () => {
    const getUserMedia = vi.fn();
    (navigator as any).mediaDevices = { getUserMedia };

    render(<ObjectScanner isOpen={false} onClose={vi.fn()} onIdentify={vi.fn()} />);

    expect(getUserMedia).not.toHaveBeenCalled();
  });

  describe('capture, identify, and confirm flow', () => {
    const originalFetch = global.fetch;
    const originalVibrate = (navigator as any).vibrate;

    beforeEach(() => {
      mockCameraDom();
      mockGetUserMedia();
      decodeFromImageUrlMock.mockRejectedValue(new Error('no barcode'));
      recognizeMock.mockResolvedValue({ data: { text: '' } });
      (navigator as any).vibrate = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      (navigator as any).vibrate = originalVibrate;
    });

    it('identifies via the vision backend and waits for confirmation before calling onIdentify', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'Ibuprofen 200mg', category: 'medications', confidence: 0.92 }),
      }) as any;
      const onIdentify = vi.fn();
      const user = userEvent.setup();

      render(<ObjectScanner isOpen onClose={vi.fn()} onIdentify={onIdentify} />);

      await user.click(await screen.findByRole('button', { name: /capture & identify/i }));

      expect(await screen.findByText('Ibuprofen 200mg')).toBeInTheDocument();
      expect(screen.getByText("Is this correct?")).toBeInTheDocument();
      expect(onIdentify).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /yes, that's it/i }));

      expect(onIdentify).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Ibuprofen 200mg', category: 'medications' }),
      );
    });

    it('resets to the camera view without calling onIdentify when the user retakes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'Aspirin', category: 'medications', confidence: 0.8 }),
      }) as any;
      const onIdentify = vi.fn();
      const user = userEvent.setup();

      render(<ObjectScanner isOpen onClose={vi.fn()} onIdentify={onIdentify} />);

      await user.click(await screen.findByRole('button', { name: /capture & identify/i }));
      await screen.findByText('Aspirin');

      await user.click(screen.getByRole('button', { name: /no, retake/i }));

      expect(onIdentify).not.toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: /capture & identify/i })).toBeInTheDocument();
    });

    it('shows a failure state and allows retaking when nothing can be identified', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as any;
      const user = userEvent.setup();

      render(<ObjectScanner isOpen onClose={vi.fn()} onIdentify={vi.fn()} />);

      await user.click(await screen.findByRole('button', { name: /capture & identify/i }));

      expect(await screen.findByText(/couldn't identify this item/i)).toBeInTheDocument();
    });

    it('identifies by barcode via a UPC lookup when the vision backend and OCR find nothing', async () => {
      decodeFromImageUrlMock.mockResolvedValue({ getText: () => '012345678905' });
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('vision/identify')) {
          return Promise.resolve({ ok: false, status: 503 });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ status: 1, product: { product_name: 'Adhesive Bandages Box' } }),
        });
      }) as any;
      const onIdentify = vi.fn();
      const user = userEvent.setup();

      render(<ObjectScanner isOpen onClose={vi.fn()} onIdentify={onIdentify} />);

      await user.click(await screen.findByRole('button', { name: /capture & identify/i }));

      expect(await screen.findByText('Adhesive Bandages Box')).toBeInTheDocument();
      expect(screen.getByText(/barcode 012345678905/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /yes, that's it/i }));

      expect(onIdentify).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Adhesive Bandages Box', barcode: '012345678905' }),
      );
    });
  });
});
