// StowAway Tracker - Feature Flags
// Designed for future monetization without implementing payments

import { SubscriptionTier } from '@/types';

export interface FeatureFlags {
  scanning: boolean;
  expirationReminders: boolean;
  vendorSuggestions: boolean;
  csvExport: boolean;
  pdfExport: boolean;
  multiVessel: boolean;
  whiteLabelBranding: boolean;
  advancedAlerts: boolean;
  regulatoryTemplates: boolean;
  syncToCloud: boolean; // Future feature
}

// Feature availability by tier
const TIER_FEATURES: Record<SubscriptionTier, FeatureFlags> = {
  free: {
    scanning: true, // Basic scanning for all
    expirationReminders: true, // 30-day only
    vendorSuggestions: false,
    csvExport: true,
    pdfExport: false,
    multiVessel: false,
    whiteLabelBranding: false,
    advancedAlerts: false, // Only basic alerts
    regulatoryTemplates: true, // Reference only
    syncToCloud: false,
  },
  pro: {
    scanning: true,
    expirationReminders: true, // 30/60/90 days
    vendorSuggestions: true,
    csvExport: true,
    pdfExport: true,
    multiVessel: false,
    whiteLabelBranding: false,
    advancedAlerts: true,
    regulatoryTemplates: true,
    syncToCloud: true,
  },
  fleet: {
    scanning: true,
    expirationReminders: true,
    vendorSuggestions: true,
    csvExport: true,
    pdfExport: true,
    multiVessel: true,
    whiteLabelBranding: true,
    advancedAlerts: true,
    regulatoryTemplates: true,
    syncToCloud: true,
  },
};

export function getFeatures(tier: SubscriptionTier): FeatureFlags {
  return TIER_FEATURES[tier];
}

export function hasFeature(tier: SubscriptionTier, feature: keyof FeatureFlags): boolean {
  return TIER_FEATURES[tier][feature];
}

// Feature metadata for upgrade prompts
export const FEATURE_INFO: Record<keyof FeatureFlags, { 
  name: string; 
  description: string; 
  requiredTier: SubscriptionTier 
}> = {
  scanning: {
    name: 'Barcode Scanning',
    description: 'Scan barcodes and QR codes to quickly add items',
    requiredTier: 'free',
  },
  expirationReminders: {
    name: 'Expiration Reminders',
    description: 'Get notified when items are approaching expiration',
    requiredTier: 'free',
  },
  vendorSuggestions: {
    name: 'Vendor Suggestions',
    description: 'Get suggestions for where to restock supplies',
    requiredTier: 'pro',
  },
  csvExport: {
    name: 'CSV Export',
    description: 'Export your inventory to CSV format',
    requiredTier: 'free',
  },
  pdfExport: {
    name: 'PDF Export',
    description: 'Generate printable PDF checklists',
    requiredTier: 'pro',
  },
  multiVessel: {
    name: 'Multi-Vessel Support',
    description: 'Manage inventory across multiple vessels',
    requiredTier: 'fleet',
  },
  whiteLabelBranding: {
    name: 'White-Label Branding',
    description: 'Customize branding for your organization',
    requiredTier: 'fleet',
  },
  advancedAlerts: {
    name: 'Advanced Alerts',
    description: 'Customizable alert thresholds and notifications',
    requiredTier: 'pro',
  },
  regulatoryTemplates: {
    name: 'Regulatory Templates',
    description: 'Reference templates from USCG, RYA, and WHO',
    requiredTier: 'free',
  },
  syncToCloud: {
    name: 'Cloud Sync',
    description: 'Sync your inventory across devices',
    requiredTier: 'pro',
  },
};
