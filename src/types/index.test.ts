import { describe, it, expect } from 'vitest';
import { CATEGORY_INFO, LOCATION_INFO } from './index';
import type { ItemCategory, StorageLocation } from './index';

const CATEGORIES: ItemCategory[] = [
  'first-aid',
  'medications',
  'tools',
  'emergency',
  'hygiene',
  'diagnostic',
  'ppe',
  'other',
];

const LOCATIONS: StorageLocation[] = [
  'head-fore',
  'head-aft',
  'stbd-cabinet-settee-fore',
  'stbd-cabinet-settee-aft',
  'galley',
  'main-cabin',
  'cockpit',
  'nav-station',
  'forepeak',
  'lazarette',
  'deck-locker',
  'other',
];

describe('CATEGORY_INFO', () => {
  it('has metadata for every ItemCategory value', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_INFO[category]).toBeDefined();
      expect(CATEGORY_INFO[category].label.length).toBeGreaterThan(0);
    }
  });
});

describe('LOCATION_INFO', () => {
  it('has metadata for every StorageLocation value', () => {
    for (const location of LOCATIONS) {
      expect(LOCATION_INFO[location]).toBeDefined();
      expect(LOCATION_INFO[location].label.length).toBeGreaterThan(0);
    }
  });
});
