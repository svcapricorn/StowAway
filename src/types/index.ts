// StowAway Tracker - Core Types

export type UserRole = 'captain' | 'medic' | 'crew';

export type SubscriptionTier = 'free' | 'pro' | 'fleet';

export type ItemCategory = 
  | 'first-aid'
  | 'medications'
  | 'tools'
  | 'emergency'
  | 'hygiene'
  | 'diagnostic'
  | 'ppe'
  | 'other';

export type ItemStatus = 'ok' | 'low-stock' | 'expiring-soon' | 'expired' | 'critical';

export type StorageLocation = 
  | 'head-fore'
  | 'head-aft'
  | 'stbd-cabinet-settee-fore'
  | 'stbd-cabinet-settee-aft'
  | 'galley'
  | 'main-cabin' // Legacy
  | 'cockpit' // Legacy
  | 'nav-station' // Legacy
  | 'forepeak' // Legacy
  | 'lazarette' // Legacy
  | 'deck-locker' // Legacy
  | 'other';

export interface InventoryItem {
  id: string;
  // Core Identity
  nickname?: string;
  name: string; // "Label Name"
  chemicalName?: string;
  brand?: string;
  
  // Categorization
  category: ItemCategory;
  vessel?: string; // Manually entered or inherited
  
  // Medical Details
  strength?: string; // e.g. "500mg"
  unitType?: string; // e.g. "pill", "ml"
  unitSize?: string; // e.g. "100 count bottle"
  container?: string; // e.g. "Orange Bottle", "Box"
  scriptName?: string; // "Name on Script"

  // Quantities
  quantity: number; // Number of full units/containers
  remaining?: string; // e.g. "50%", "10 pills" (Visual estimate)
  dosesLeft?: number; // Calculated/tracked specific doses
  minQuantity: number; // For low-stock alerts
  
  // Logistics
  expirationDate?: string; // ISO date string
  location: StorageLocation;
  barcode?: string;
  
  // Media & Meta
  photos?: string[]; // Array of base64 strings or URLs
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vessel {
  id: string;
  name: string;
  type?: string; // e.g., "Sailing Yacht", "Catamaran"
  ownerId: string;
}

export interface Alert {
  id: string;
  itemId: string;
  type: 'low-stock' | 'expiring' | 'expired';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
  createdAt: string;
}

export interface AppSettings {
  vesselId?: string;
  vesselName?: string;
  lowStockThreshold: number; // percentage, e.g., 25
  expirationWarningDays: number[]; // e.g., [30, 60, 90]
  theme: 'light' | 'dark' | 'system';
  userRole: UserRole;
  subscriptionTier: SubscriptionTier;
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'print';
  includeExpired: boolean;
  includeNotes: boolean;
  groupByCategory: boolean;
}

// Embedded Mode Configuration
export interface EmbeddedConfig {
  authToken?: string;
  vesselId: string;
  userRole: UserRole;
  theme?: {
    primaryColor?: string;
    darkMode?: boolean;
    logo?: string;
  };
  onInventoryUpdated?: (items: InventoryItem[]) => void;
  onLowStockAlert?: (items: InventoryItem[]) => void;
  onExpirationWarning?: (items: InventoryItem[]) => void;
}

// Regulatory Template (non-enforcing reference)
export interface RegulatoryTemplate {
  id: string;
  name: string;
  source: string;
  description: string;
  disclaimer: string;
  items: TemplateItem[];
}

export interface TemplateItem {
  name: string;
  category: ItemCategory;
  recommendedQuantity: number;
  notes?: string;
}

// Category metadata for UI
export const CATEGORY_INFO: Record<ItemCategory, { label: string; icon: string; color: string }> = {
  'first-aid': { label: 'First Aid', icon: 'Cross', color: 'text-destructive' },
  'medications': { label: 'Medications', icon: 'Pill', color: 'text-secondary' },
  'tools': { label: 'Medical Tools', icon: 'Stethoscope', color: 'text-primary' },
  'emergency': { label: 'Emergency', icon: 'AlertTriangle', color: 'text-warning' },
  'hygiene': { label: 'Hygiene', icon: 'Droplets', color: 'text-success' },
  'diagnostic': { label: 'Diagnostic', icon: 'Activity', color: 'text-info' },
  'ppe': { label: 'PPE', icon: 'Shield', color: 'text-accent' },
  'other': { label: 'Other', icon: 'Package', color: 'text-muted-foreground' },
};

export const LOCATION_INFO: Record<StorageLocation, { label: string }> = {
  'head-fore': { label: 'Head - fore' },
  'head-aft': { label: 'Head - aft' },
  'stbd-cabinet-settee-fore': { label: 'Stbd cabinet above Settee - fore' },
  'stbd-cabinet-settee-aft': { label: 'Stbd cabinet above Settee - aft' },
  'galley': { label: 'Galley' },
  'other': { label: 'Other' },
  // Legacy locations
  'main-cabin': { label: 'Main Cabin (Legacy)' },
  'cockpit': { label: 'Cockpit (Legacy)' },
  'nav-station': { label: 'Nav Station (Legacy)' },
  'forepeak': { label: 'Forepeak (Legacy)' },
  'lazarette': { label: 'Lazarette (Legacy)' },
  'deck-locker': { label: 'Deck Locker (Legacy)' },
};
