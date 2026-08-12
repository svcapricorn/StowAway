import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './Login';

const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/" element={<div>DASHBOARD</div>} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('shows a loading spinner while auth state is resolving', () => {
    useAuthMock.mockReturnValue({ loading: true, isAuthenticated: false, isConfigured: true });

    renderLogin();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to the dashboard when already authenticated', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true, isConfigured: true });

    renderLogin();

    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });

  it('warns when Supabase is not configured', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: false, isConfigured: false });

    renderLogin();

    expect(screen.getByText(/Add VITE_SUPABASE_URL/i)).toBeInTheDocument();
  });

  it('signs in successfully and shows a success message', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    useAuthMock.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      isConfigured: true,
      signInWithPassword,
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'captain@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter2');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith('captain@example.com', 'hunter2');
    });
    expect(await screen.findByText('Signed in successfully.')).toBeInTheDocument();
  });

  it('shows an error message when sign-in fails', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: new Error('Invalid credentials') });
    useAuthMock.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      isConfigured: true,
      signInWithPassword,
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'captain@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
