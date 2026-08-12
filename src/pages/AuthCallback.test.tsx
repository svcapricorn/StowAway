import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthCallbackPage from './AuthCallback';

const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderCallback(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>DASHBOARD</div>} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('shows a friendly error for an expired or invalid confirmation link', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: false });
    window.history.pushState(
      {},
      '',
      '/auth/callback#error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    );

    renderCallback('/auth/callback');

    expect(screen.getByText('Sign-in Link Problem')).toBeInTheDocument();
    expect(screen.getByText('Email link is invalid or has expired')).toBeInTheDocument();
  });

  it('shows a loading spinner while the session is being resolved', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: true });

    renderCallback('/auth/callback');

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to the dashboard once authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, loading: false });

    renderCallback('/auth/callback');

    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated and no error is present', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: false });

    renderCallback('/auth/callback');

    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });
});
