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
