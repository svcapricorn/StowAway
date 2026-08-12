import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

function mockMatchMedia() {
  const listeners: Array<() => void> = [];
  (window as any).matchMedia = vi.fn().mockImplementation(() => ({
    addEventListener: (_event: string, cb: () => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }));
  return { fireChange: () => listeners.forEach((cb) => cb()) };
}

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

describe('useIsMobile', () => {
  afterEach(() => {
    setWindowWidth(1024);
  });

  it('reports mobile when the viewport is narrower than the breakpoint', () => {
    mockMatchMedia();
    setWindowWidth(500);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('reports desktop when the viewport is at or above the breakpoint', () => {
    mockMatchMedia();
    setWindowWidth(1024);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('updates when the media query change handler fires', () => {
    const { fireChange } = mockMatchMedia();
    setWindowWidth(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setWindowWidth(400);
    act(() => {
      fireChange();
    });

    expect(result.current).toBe(true);
  });
});
