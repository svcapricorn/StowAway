import { describe, it, expect, afterEach, vi } from 'vitest';

describe('config/supabase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports not configured and exports a null client when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();

    const mod = await import('./supabase');

    expect(mod.hasSupabaseConfig).toBe(false);
    expect(mod.supabase).toBeNull();
  });

  it('creates a client when both env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.resetModules();

    const mod = await import('./supabase');

    expect(mod.hasSupabaseConfig).toBe(true);
    expect(mod.supabase).not.toBeNull();
  });
});
