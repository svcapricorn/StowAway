import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>PROTECTED CONTENT</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    vi.unstubAllEnvs();
  });

  it('renders protected content when mock auth is enabled, regardless of auth state', () => {
    vi.stubEnv('VITE_MOCK_AUTH', 'true');
    useAuthMock.mockReturnValue({ isAuthenticated: false, isConfigured: false, loading: true });

    renderProtected();

    expect(screen.getByText('PROTECTED CONTENT')).toBeInTheDocument();
  });

  it('shows a configuration warning when Supabase env vars are missing', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isConfigured: false, loading: false });

    renderProtected();

    expect(screen.getByText('Authentication Not Configured')).toBeInTheDocument();
  });

  it('shows a loading spinner while auth state is resolving', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isConfigured: true, loading: true });

    renderProtected();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isConfigured: true, loading: false });

    renderProtected();

    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders the protected outlet when authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isConfigured: true, loading: false });

    renderProtected();

    expect(screen.getByText('PROTECTED CONTENT')).toBeInTheDocument();
  });
});
