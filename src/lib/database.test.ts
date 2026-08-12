import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockSupabase: any = null;

vi.mock('@/config/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

describe('database', () => {
  const originalFetch = global.fetch;
  const originalHostname = window.location.hostname;

  beforeEach(async () => {
    vi.resetModules();
    mockSupabase = null;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: originalHostname },
      writable: true,
    });
  });

  it('uses dev-token headers when running on localhost', async () => {
    const { getHeaders } = await import('./database');
    const headers = await getHeaders();

    expect(headers.Authorization).toBe('Bearer dev-token');
    expect(headers['x-dev-user-id']).toBe('dev-user-123');
  });

  it('inventoryDB.getAll fetches from the API and returns parsed json', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: '1' }] });

    const { inventoryDB } = await import('./database');
    const items = await inventoryDB.getAll();

    expect(items).toEqual([{ id: '1' }]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/inventory'), expect.any(Object));
  });

  it('inventoryDB.getAll throws when the request fails', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });

    const { inventoryDB } = await import('./database');

    await expect(inventoryDB.getAll()).rejects.toThrow('Failed to fetch items');
  });

  it('inventoryDB.add posts the item and returns the created id', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'new-id' }) });

    const { inventoryDB } = await import('./database');
    const id = await inventoryDB.add({ id: 'x' } as any);

    expect(id).toBe('new-id');
  });

  it('inventoryDB.getByBarcode filters the full list client-side', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', barcode: '111' },
        { id: '2', barcode: '222' },
      ],
    });

    const { inventoryDB } = await import('./database');
    const found = await inventoryDB.getByBarcode('222');

    expect(found?.id).toBe('2');
  });

  it('inventoryDB.getLowStock filters items below their minimum quantity', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', quantity: 0, minQuantity: 2 },
        { id: '2', quantity: 10, minQuantity: 1 },
      ],
    });

    const { inventoryDB } = await import('./database');
    const lowStock = await inventoryDB.getLowStock();

    expect(lowStock.map((i: any) => i.id)).toEqual(['1']);
  });

  it('settingsDB.getDefaults returns sensible default settings', async () => {
    const { settingsDB } = await import('./database');
    const defaults = settingsDB.getDefaults();

    expect(defaults.lowStockThreshold).toBeGreaterThan(0);
    expect(defaults.theme).toBeDefined();
  });

  it('settingsDB.save and settingsDB.get round-trip through the local store', async () => {
    const { settingsDB } = await import('./database');
    const settings = settingsDB.getDefaults();

    await settingsDB.save({ ...settings, vesselName: 'Sea Breeze' });
    const loaded = await settingsDB.get();

    expect(loaded?.vesselName).toBe('Sea Breeze');
  });

  it('inventoryDB.update sends a PUT request and resolves', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true });

    const { inventoryDB } = await import('./database');
    const result = await inventoryDB.update('1', { quantity: 3 });

    expect(result).toBe(1);
    expect((global.fetch as any).mock.calls[0][1].method).toBe('PUT');
  });

  it('inventoryDB.update throws when the request fails', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });

    const { inventoryDB } = await import('./database');

    await expect(inventoryDB.update('1', { quantity: 3 })).rejects.toThrow('Failed to update item');
  });

  it('inventoryDB.delete sends a DELETE request', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true });

    const { inventoryDB } = await import('./database');
    await inventoryDB.delete('1');

    expect((global.fetch as any).mock.calls[0][1].method).toBe('DELETE');
  });

  it('inventoryDB.getById filters the full list client-side', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: '1' }, { id: '2' }] });

    const { inventoryDB } = await import('./database');
    const found = await inventoryDB.getById('2');

    expect(found?.id).toBe('2');
  });

  it('inventoryDB.getByCategory filters the full list client-side', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', category: 'tools' },
        { id: '2', category: 'medications' },
      ],
    });

    const { inventoryDB } = await import('./database');
    const found = await inventoryDB.getByCategory('medications');

    expect(found.map((i: any) => i.id)).toEqual(['2']);
  });

  it('inventoryDB.bulkAdd calls add for each item', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'new' }) });

    const { inventoryDB } = await import('./database');
    await inventoryDB.bulkAdd([{ id: 'a' } as any, { id: 'b' } as any]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('inventoryDB.getExpired filters items past their expiration date', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', expirationDate: new Date(Date.now() - 86400000).toISOString() },
        { id: '2', expirationDate: new Date(Date.now() + 86400000).toISOString() },
      ],
    });

    const { inventoryDB } = await import('./database');
    const expired = await inventoryDB.getExpired();

    expect(expired.map((i: any) => i.id)).toEqual(['1']);
  });

  it('inventoryDB.getExpiringSoon filters items within the given window', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', expirationDate: new Date(Date.now() + 5 * 86400000).toISOString() },
        { id: '2', expirationDate: new Date(Date.now() + 60 * 86400000).toISOString() },
      ],
    });

    const { inventoryDB } = await import('./database');
    const soon = await inventoryDB.getExpiringSoon(30);

    expect(soon.map((i: any) => i.id)).toEqual(['1']);
  });

  it('inventoryDB.clear does not throw (no-op for safety)', async () => {
    const { inventoryDB } = await import('./database');
    await expect(inventoryDB.clear()).resolves.toBeUndefined();
  });
});
