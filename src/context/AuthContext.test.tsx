import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
};

let mockSupabase: any = null;
let mockHasConfig = false;

vi.mock('@/config/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
  get hasSupabaseConfig() {
    return mockHasConfig;
  },
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="configured">{String(auth.isConfigured)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="email">{auth.user?.email ?? 'none'}</span>
    </div>
  );
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = null;
    mockHasConfig = false;
    authMock.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('reports not configured and not loading when Supabase is unset', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('configured').textContent).toBe('false');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('picks up an existing session once configured', async () => {
    mockHasConfig = true;
    mockSupabase = {
      auth: {
        ...authMock,
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'tok', user: { email: 'captain@example.com' } } },
        }),
      },
    };

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));
    expect(screen.getByTestId('email').textContent).toBe('captain@example.com');
  });

  it('signInWithPassword delegates to the Supabase client', async () => {
    mockHasConfig = true;
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    mockSupabase = {
      auth: { ...authMock, getSession: vi.fn().mockResolvedValue({ data: { session: null } }), signInWithPassword },
    };

    let authRef: ReturnType<typeof useAuth> | undefined;
    function Capture() {
      authRef = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    );

    await waitFor(() => expect(authRef?.loading).toBe(false));
    await authRef!.signInWithPassword('a@b.com', 'secret');

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
  });

  it('returns a configuration error when Supabase is not set up', async () => {
    let authRef: ReturnType<typeof useAuth> | undefined;
    function Capture() {
      authRef = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    );

    await waitFor(() => expect(authRef?.loading).toBe(false));
    const { error } = await authRef!.signInWithPassword('a@b.com', 'secret');

    expect(error?.message).toBe('Supabase auth is not configured.');
  });
});
