import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, CircularProgress } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

// Supabase redirects here after email confirmation / magic-link clicks.
// Failed/expired links arrive with error params instead of a session.
function readCallbackError(): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);
  const description = hashParams.get('error_description') || searchParams.get('error_description');
  const error = hashParams.get('error') || searchParams.get('error');

  if (description) {
    return description.replace(/\+/g, ' ');
  }

  return error;
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [callbackError] = useState(readCallbackError);

  if (callbackError) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/login', { replace: true })}>
              Back to Sign In
            </Button>
          }
        >
          <AlertTitle>Sign-in Link Problem</AlertTitle>
          {callbackError}
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Supabase sent us here, but there's no session and no error param came through.
  // This usually means the link expired/was already used, or the redirect URL isn't
  // in the Supabase Auth "Redirect URLs" allow list — bouncing straight to /login
  // silently makes that look like a broken link, so surface it instead.
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/login', { replace: true })}>
            Back to Sign In
          </Button>
        }
      >
        <AlertTitle>Couldn't Complete Sign-In</AlertTitle>
        This link didn't sign you in. It may have expired or already been used — request a new
        confirmation email or magic link and try again.
      </Alert>
    </Box>
  );
}
