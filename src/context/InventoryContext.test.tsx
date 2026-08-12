import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { InventoryItem, AppSettings } from '@/types';
import { InventoryProvider, useInventory } from './InventoryContext';

vi.mock('@/lib/database', () => ({
  inventoryDB: {
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  settingsDB: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

import { inventoryDB, settingsDB } from '@/lib/database';

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: overrides.id ?? 'item-1',
    name: 'Test Item',
    category: 'first-aid',
    quantity: 5,
    minQuantity: 1,
    location: 'galley',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

describe('InventoryProvider / useInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (settingsDB.get as any).mockResolvedValue(undefined);
  });

  it('computes stats from loaded items (low stock, expired, expiring soon)', async () => {
    (inventoryDB.getAll as any).mockResolvedValue([
      makeItem({ id: '1', quantity: 0, minQuantity: 2 }), // low stock
      makeItem({ id: '2', expirationDate: yesterday }), // expired
      makeItem({ id: '3', expirationDate: in10Days }), // expiring soon
      makeItem({ id: '4', quantity: 10, minQuantity: 1 }), // fine
    ]);

    const { result } = renderHook(() => useInventory(), {
      wrapper: ({ children }) => <InventoryProvider>{children}</InventoryProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats.totalItems).toBe(4);
    expect(result.current.stats.lowStockCount).toBe(1);
    expect(result.current.stats.expiredCount).toBe(1);
    expect(result.current.stats.expiringSoonCount).toBe(1);
  });

  it('merges persisted settings over the defaults', async () => {
    (inventoryDB.getAll as any).mockResolvedValue([]);
    (settingsDB.get as any).mockResolvedValue({ vesselName: 'Sea Breeze' } as Partial<AppSettings>);

    const { result } = renderHook(() => useInventory(), {
      wrapper: ({ children }) => <InventoryProvider>{children}</InventoryProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.vesselName).toBe('Sea Breeze');
    expect(result.current.settings.lowStockThreshold).toBe(25);
  });

  it('addItem persists via inventoryDB and updates local state', async () => {
    (inventoryDB.getAll as any).mockResolvedValue([]);
    (inventoryDB.add as any).mockResolvedValue('new-id');

    const { result } = renderHook(() => useInventory(), {
      wrapper: ({ children }) => <InventoryProvider>{children}</InventoryProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem({
        name: 'New Item',
        category: 'tools',
        quantity: 2,
        minQuantity: 1,
        location: 'galley',
      });
    });

    expect(inventoryDB.add).toHaveBeenCalledTimes(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('New Item');
  });

  it('deleteItem removes the item from local state', async () => {
    (inventoryDB.getAll as any).mockResolvedValue([makeItem({ id: 'to-delete' })]);
    (inventoryDB.delete as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useInventory(), {
      wrapper: ({ children }) => <InventoryProvider>{children}</InventoryProvider>,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.deleteItem('to-delete');
    });

    expect(inventoryDB.delete).toHaveBeenCalledWith('to-delete');
    expect(result.current.items).toHaveLength(0);
  });

  it('exportToCSV includes a header row and one row per item', async () => {
    (inventoryDB.getAll as any).mockResolvedValue([makeItem({ id: '1', name: 'Gauze' })]);

    const { result } = renderHook(() => useInventory(), {
      wrapper: ({ children }) => <InventoryProvider>{children}</InventoryProvider>,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const csv = result.current.exportToCSV();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Label Name');
    expect(lines[1]).toContain('Gauze');
  });
});
