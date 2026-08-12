import { describe, it, expect } from 'vitest';
import { getFeatures } from './featureFlags';

describe('getFeatures', () => {
  it('disables pro features on the free tier', () => {
    const features = getFeatures('free');
    expect(features.pdfExport).toBe(false);
    expect(features.multiVessel).toBe(false);
    expect(features.csvExport).toBe(true);
  });

  it('enables pro features but not fleet features on the pro tier', () => {
    const features = getFeatures('pro');
    expect(features.pdfExport).toBe(true);
    expect(features.vendorSuggestions).toBe(true);
    expect(features.multiVessel).toBe(false);
  });

  it('enables every feature on the fleet tier', () => {
    const features = getFeatures('fleet');
    expect(Object.values(features).every(Boolean)).toBe(true);
  });
});
