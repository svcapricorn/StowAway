// StowAway Tracker - Inventory Context
// Global state management for inventory data

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, settingsDB } from '@/lib/database';
import { getFeatures } from '@/config/featureFlags';
import type { 
  InventoryItem, 
  ItemCategory, 
  StorageLocation, 
  AppSettings, 
  ItemStatus,
  EmbeddedConfig 
} from '@/types';

interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  categoryCounts: Record<ItemCategory, number>;
}

interface InventoryContextType {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  settings: AppSettings;
  stats: InventoryStats;
  isEmbedded: boolean;
  
  // CRUD operations
  addItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, changes: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemById: (id: string) => InventoryItem | undefined;
  getItemByBarcode: (barcode: string) => Promise<InventoryItem | undefined>;
  
  // Filtering
  getItemsByCategory: (category: ItemCategory) => InventoryItem[];
  getItemsByLocation: (location: StorageLocation) => InventoryItem[];
  getItemsByStatus: (status: ItemStatus) => InventoryItem[];
  
  // Alerts
  getLowStockItems: () => InventoryItem[];
  getExpiringSoonItems: (days?: number) => InventoryItem[];
  getExpiredItems: () => InventoryItem[];
  
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  
  // Data operations
  refreshData: () => Promise<void>;
  exportToCSV: () => string;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: React.ReactNode;
  embeddedConfig?: EmbeddedConfig;
}

export function InventoryProvider({ children, embeddedConfig }: InventoryProviderProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    lowStockThreshold: 25,
    expirationWarningDays: [30, 60, 90],
    theme: 'system',
    userRole: embeddedConfig?.userRole || 'captain',
    subscriptionTier: 'free',
    vesselId: embeddedConfig?.vesselId,
  });

  const isEmbedded = !!embeddedConfig;

  // Calculate stats
  const stats: InventoryStats = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const lowStockItems = items.filter(i => i.quantity <= i.minQuantity);
    const expiredItems = items.filter(i => i.expirationDate && new Date(i.expirationDate) < now);
    const expiringSoonItems = items.filter(i => {
      if (!i.expirationDate) return false;
      const expDate = new Date(i.expirationDate);
      return expDate >= now && expDate <= thirtyDaysFromNow;
    });

    const categoryCounts: Record<ItemCategory, number> = {
      'first-aid': 0,
      'medications': 0,
      'tools': 0,
      'emergency': 0,
      'hygiene': 0,
      'diagnostic': 0,
      'ppe': 0,
      'other': 0,
    };

    items.forEach(item => {
      categoryCounts[item.category]++;
    });

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      expiringSoonCount: expiringSoonItems.length,
      expiredCount: expiredItems.length,
      categoryCounts,
    };
  }, [items]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [loadedItems, loadedSettings] = await Promise.all([
        inventoryDB.getAll(),
        settingsDB.get(),
      ]);

      setItems(loadedItems);
      
      if (loadedSettings) {
        setSettings(prev => ({ ...prev, ...loadedSettings }));
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Notify embedded host of changes
  const notifyHost = useCallback((newItems: InventoryItem[]) => {
    if (!embeddedConfig) return;

    embeddedConfig.onInventoryUpdated?.(newItems);

    const lowStock = newItems.filter(i => i.quantity <= i.minQuantity);
    if (lowStock.length > 0) {
      embeddedConfig.onLowStockAlert?.(lowStock);
    }

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiring = newItems.filter(i => {
      if (!i.expirationDate) return false;
      const exp = new Date(i.expirationDate);
      return exp >= now && exp <= thirtyDays;
    });
    if (expiring.length > 0) {
      embeddedConfig.onExpirationWarning?.(expiring);
    }
  }, [embeddedConfig]);

  // CRUD operations
  const addItem = useCallback(async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...itemData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await inventoryDB.add(newItem);
    const newItems = [...items, newItem];
    setItems(newItems);
    notifyHost(newItems);
  }, [items, notifyHost]);

  const updateItem = useCallback(async (id: string, changes: Partial<InventoryItem>) => {
    await inventoryDB.update(id, changes);
    const newItems = items.map(item => 
      item.id === id 
        ? { ...item, ...changes, updatedAt: new Date().toISOString() }
        : item
    );
    setItems(newItems);
    notifyHost(newItems);
  }, [items, notifyHost]);

  const deleteItem = useCallback(async (id: string) => {
    await inventoryDB.delete(id);
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    notifyHost(newItems);
  }, [items, notifyHost]);

  const getItemById = useCallback((id: string) => {
    return items.find(item => item.id === id);
  }, [items]);

  const getItemByBarcode = useCallback(async (barcode: string) => {
    return inventoryDB.getByBarcode(barcode);
  }, []);

  // Filtering
  const getItemsByCategory = useCallback((category: ItemCategory) => {
    return items.filter(item => item.category === category);
  }, [items]);

  const getItemsByLocation = useCallback((location: StorageLocation) => {
    return items.filter(item => item.location === location);
  }, [items]);

  const getItemsByStatus = useCallback((status: ItemStatus) => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return items.filter(item => {
      switch (status) {
        case 'expired':
          return item.expirationDate && new Date(item.expirationDate) < now;
        case 'expiring-soon':
          if (!item.expirationDate) return false;
          const exp = new Date(item.expirationDate);
          return exp >= now && exp <= thirtyDays;
        case 'low-stock':
          return item.quantity <= item.minQuantity && item.quantity > 0;
        case 'critical':
          return item.quantity === 0 || (item.expirationDate && new Date(item.expirationDate) < now);
        case 'ok':
        default:
          const isExpired = item.expirationDate && new Date(item.expirationDate) < now;
          const isLow = item.quantity <= item.minQuantity;
          return !isExpired && !isLow;
      }
    });
  }, [items]);

  // Alert getters
  const getLowStockItems = useCallback(() => {
    return items.filter(item => item.quantity <= item.minQuantity);
  }, [items]);

  const getExpiringSoonItems = useCallback((days = 30) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return items.filter(item => {
      if (!item.expirationDate) return false;
      const exp = new Date(item.expirationDate);
      return exp >= now && exp <= futureDate;
    });
  }, [items]);

  const getExpiredItems = useCallback(() => {
    const now = new Date();
    return items.filter(item => item.expirationDate && new Date(item.expirationDate) < now);
  }, [items]);

  // Settings
  const updateSettings = useCallback(async (changes: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...changes };
    await settingsDB.save(newSettings);
    setSettings(newSettings);
  }, [settings]);

  // Refresh
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = [
      'Nickname', 'Category', 'Label Name', 'Chemical Name', 'Brand', 'Container', 'Vessel', 
      'Location', 'Strength', 'Unit type', 'Quantity', 'Remaining', 'Min Quantity', 
      'Name on Script', 'Doses left', 'Unit size', 'Expiration', 'Notes', 'Barcode'
    ];
    const rows = items.map(item => [
      item.nickname || '',
      item.category,
      item.name, // Label Name
      item.chemicalName || '',
      item.brand || '',
      item.container || '',
      item.vessel || '',
      item.location,
      item.strength || '',
      item.unitType || '',
      item.quantity.toString(),
      item.remaining || '',
      item.minQuantity.toString(),
      item.scriptName || '',
      item.dosesLeft?.toString() || '',
      item.unitSize || '',
      item.expirationDate || '',
      item.notes || '',
      item.barcode || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }, [items]);

  const value: InventoryContextType = {
    items,
    isLoading,
    error,
    settings,
    stats,
    isEmbedded,
    addItem,
    updateItem,
    deleteItem,
    getItemById,
    getItemByBarcode,
    getItemsByCategory,
    getItemsByLocation,
    getItemsByStatus,
    getLowStockItems,
    getExpiringSoonItems,
    getExpiredItems,
    updateSettings,
    refreshData,
    exportToCSV,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
