import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './Settings';

const useInventoryMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/context/InventoryContext', () => ({ useInventory: () => useInventoryMock() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInventoryMock.mockReturnValue({
      settings: { vesselName: 'Sea Breeze', userRole: 'captain', subscriptionTier: 'free' },
      exportToCSV: vi.fn().mockReturnValue('a,b\n1,2'),
      items: [{ id: '1' }],
      stats: { totalItems: 1 },
    });
    useAuthMock.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      isAuthenticated: true,
      isConfigured: true,
      signOut: vi.fn(),
      user: { email: 'captain@example.com' },
    });
    global.fetch = vi.fn();
  });

  it('shows vessel info from settings', () => {
    renderSettings();

    expect(screen.getByText('Sea Breeze')).toBeInTheDocument();
    expect(screen.getByText(/captain.*1 items tracked/i)).toBeInTheDocument();
  });

  it('shows authenticated and configured diagnostics', () => {
    renderSettings();

    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('captain@example.com')).toBeInTheDocument();
  });

  it('shows not-authenticated diagnostics when logged out', () => {
    useAuthMock.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue(null),
      isAuthenticated: false,
      isConfigured: false,
      signOut: vi.fn(),
      user: null,
    });

    renderSettings();

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
    expect(screen.getByText('Missing env vars')).toBeInTheDocument();
  });

  it('calls signOut when Sign Out is clicked', async () => {
    const signOut = vi.fn();
    useAuthMock.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      isAuthenticated: true,
      isConfigured: true,
      signOut,
      user: { email: 'captain@example.com' },
    });

    renderSettings();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOut).toHaveBeenCalled();
  });

  it('shows the connected result after a successful backend ping', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ userId: 'u1' }) });

    renderSettings();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /test connection/i }));

    expect(await screen.findByText(/Connected \(User ID: u1\)/)).toBeInTheDocument();
  });

  it('exports a CSV when items are present', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderSettings();
    const user = userEvent.setup();
    await user.click(screen.getByText('Export to CSV'));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });
});
