import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia; several libs (sonner, use-mobile) need it.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
