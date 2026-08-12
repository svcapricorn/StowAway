import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BarcodeScanner } from './BarcodeScanner';

const listVideoInputDevicesMock = vi.fn();
const decodeFromVideoDeviceMock = vi.fn();
const resetMock = vi.fn();

vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: class {
    listVideoInputDevices = listVideoInputDevicesMock;
    decodeFromVideoDevice = decodeFromVideoDeviceMock;
    reset = resetMock;
  },
  NotFoundException: class NotFoundException extends Error {},
  BarcodeFormat: { QR_CODE: 0, DATA_MATRIX: 1, CODE_128: 2, EAN_13: 3, EAN_8: 4, UPC_A: 5, UPC_E: 6, CODE_39: 7, ITF: 8 },
  DecodeHintType: { POSSIBLE_FORMATS: 0 },
}));

describe('BarcodeScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decodeFromVideoDeviceMock.mockResolvedValue(undefined);
  });

  it('shows an error when no camera is available', async () => {
    listVideoInputDevicesMock.mockResolvedValue([]);

    render(<BarcodeScanner isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    expect(await screen.findByText('No camera found on this device')).toBeInTheDocument();
  });

  it('starts scanning once a camera device is found', async () => {
    listVideoInputDevicesMock.mockResolvedValue([{ deviceId: 'cam-1', label: 'Back Camera' } as any]);

    render(<BarcodeScanner isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    await waitFor(() => expect(decodeFromVideoDeviceMock).toHaveBeenCalled());
    expect(decodeFromVideoDeviceMock.mock.calls[0][0]).toBe('cam-1');
  });

  it('renders nothing camera-related when closed', () => {
    render(<BarcodeScanner isOpen={false} onClose={vi.fn()} onScan={vi.fn()} />);

    expect(listVideoInputDevicesMock).not.toHaveBeenCalled();
  });
});
