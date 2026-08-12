// StowAway Tracker - SDK Entry Point
// For embedding in other web applications

import type { EmbeddedConfig } from '@/types';

interface StowAwayInstance {
  destroy: () => void;
}

// SDK will be implemented in a future update
// This is a placeholder for the embedded mode architecture
export function createStowAwayTracker(
  container: HTMLElement | string,
  config: EmbeddedConfig
): StowAwayInstance {
  console.log('StowAway Tracker SDK initialized with config:', config);
  
  return {
    destroy: () => {
      console.log('StowAway Tracker destroyed');
    },
  };
}

// Auto-expose to window for script tag usage
if (typeof window !== 'undefined') {
  (window as any).StowAwayTracker = {
    create: createStowAwayTracker,
  };
}

export type { EmbeddedConfig, StowAwayInstance };
