import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/config/supabase', () => ({ supabase: null, hasSupabaseConfig: false }));
vi.mock('@/lib/database', () => ({
  inventoryDB: { getAll: vi.fn().mockResolvedValue([]) },
  settingsDB: { get: vi.fn().mockResolvedValue(undefined), save: vi.fn() },
}));

import App from './App';

describe('App', () => {
  it('renders the login page for an unauthenticated visitor', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    expect(await screen.findByText('StowAway Sign In')).toBeInTheDocument();
  });
});
