// StowAway Tracker - Database Adapter (Switching from Dexie to API)
import type { InventoryItem, AppSettings } from '@/types';
import { supabase } from '@/config/supabase';

// Helper to get headers with token
export const getHeaders = async () => {
  if (import.meta.env.VITE_MOCK_AUTH === 'true' || window.location.hostname === 'localhost') {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev-token',
      'x-dev-user-id': 'dev-user-123'
    };
  }
  
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// FORCE LOCALHOST for debugging if we are running locally
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_URL = isLocal ? 'http://localhost:3001/api/inventory' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/inventory');

console.log(`[Database] Using API_URL: ${API_URL}`);

// Fallback Settings DB (Local only for now, or move to backend later)
import Dexie, { type EntityTable } from 'dexie';
const db = new Dexie('StowAwayLocal') as any;
db.version(1).stores({ 
  settings: 'id'
});


// Inventory operations via API
export const inventoryDB = {
  async getAll(): Promise<InventoryItem[]> {
    const headers = await getHeaders();
    const res = await fetch(API_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  async getById(id: string): Promise<InventoryItem | undefined> {
    const headers = await getHeaders();
    /* The API usually supports get-all, let's filter purely client side for now 
       OR implement get-by-id endpoint.
       Current backend has no direct get-by-ID endpoint in my previous snippet, 
       but we can use filtering if the backend supports it, or just fetch all.
       However, usually we want a direct GET. 
       Let's assume we implement GET /:id or just filter from list for robust fallback. 
       Actually, I did not implement GET /:id in backend. 
       Let's implement it now or rely on cache. 
       For now, returning undefined to force a refresh list strategy or similar is safer.
       Wait, the backend snippet shows router.put('/:id') and router.delete('/:id'), 
       but I missed router.get('/:id')!
       I will stick to client-side filtering from the main list in the Context OR 
       we assume the user will simply use getAll.
       
       Let's just implement a direct fetch if possible, or error out.
    */
    // Temporary stub: Fetch all and find (not efficient but works for MVP)
    const all = await this.getAll();
    return all.find((i) => i.id === id);
  },

  async getByBarcode(barcode: string): Promise<InventoryItem | undefined> {
    const all = await this.getAll();
    return all.find((i) => i.barcode === barcode);
  },

  async getByCategory(category: string): Promise<InventoryItem[]> {
    const all = await this.getAll();
    return all.filter((i) => i.category === category);
  },

  async add(item: InventoryItem): Promise<string> {
    const headers = await getHeaders();
    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to create item');
    const created = await res.json();
    return created.id;
  },

  async update(id: string, changes: Partial<InventoryItem>): Promise<number> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(changes),
    });
    if (!res.ok) throw new Error('Failed to update item');
    return 1;
  },

  async delete(id: string): Promise<void> {
    const headers = await getHeaders();
    await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers,
    });
  },

  async bulkAdd(items: InventoryItem[]): Promise<void> {
      // API doesn't have bulk endpoint yet, loop effectively
      for (const item of items) {
          await this.add(item);
      }
  },

  async clear(): Promise<void> {
     // Not supported in API for safety
     console.warn("Clear not supported in API mode");
  },

  // Helper filters (client side for now as backend just dumps all)
  async getExpiringSoon(days: number): Promise<InventoryItem[]> {
    const items = await this.getAll();
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return items.filter((item) => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate > now && expDate <= futureDate;
    });
  },

  async getExpired(): Promise<InventoryItem[]> {
    const items = await this.getAll();
    const now = new Date();
    return items.filter((item) => item.expirationDate && new Date(item.expirationDate) < now);
  },

  async getLowStock(): Promise<InventoryItem[]> {
    const items = await this.getAll();
    return items.filter((item) => item.quantity <= item.minQuantity);
  },
};

// Settings operations
export const settingsDB = {
  async get(): Promise<AppSettings | undefined> {
    const settings = await db.settings.get('app-settings');
    if (settings) {
      const { id, ...rest } = settings;
      return rest as AppSettings;
    }
    return undefined;
  },

  async save(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'app-settings' });
  },

  getDefaults(): AppSettings {
    return {
      lowStockThreshold: 25,
      expirationWarningDays: [30, 60, 90],
      theme: 'system',
      userRole: 'captain',
      subscriptionTier: 'free',
    };
  },
};

// Export for debugging/development
export default db;
