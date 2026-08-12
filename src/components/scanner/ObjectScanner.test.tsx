import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ObjectScanner } from './ObjectScanner';

vi.mock('@/lib/database', () => ({
  API_URL: 'http://localhost:3001/api/inventory',
  getHeaders: vi.fn().mockResolvedValue({ 'Content-Type': 'application/json' }),
}));

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
});
