import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { StowAwayLogo } from '@/components/StowAwayLogo';

export default function LoginPage() {
  const { isAuthenticated, isConfigured, loading, signInWithMagicLink, signInWithPassword, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const runAction = async (action: () => Promise<{ error: Error | null }>, successText: string) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await action();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(successText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background: 'linear-gradient(180deg, #f4f7fb 0%, #e6eef7 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 480, borderRadius: 4, boxShadow: '0 24px 60px rgba(15, 23, 42, 0.14)' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack spacing={1} alignItems="center" textAlign="center">
              <StowAwayLogo size={48} color="#1976d2" />
              <Typography variant="h4" fontWeight={700}>
                StowAway Sign In
              </Typography>
              <Typography color="text.secondary">
                Use Supabase Auth with email and password, or request a secure magic link.
              </Typography>
            </Stack>

            {!isConfigured && (
              <Alert severity="warning">
                Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend environment before using this screen.
              </Alert>
            )}

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            {successMessage && <Alert severity="success">{successMessage}</Alert>}

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={!isConfigured || !email || !password || submitting}
                onClick={() => runAction(() => signInWithPassword(email, password), 'Signed in successfully.')}
              >
                Sign In
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                disabled={!isConfigured || !email || !password || submitting}
                onClick={() =>
                  runAction(
                    () => signUp(email, password),
                    'Account created. Check your email if confirmation is enabled in Supabase.',
                  )
                }
              >
                Create Account
              </Button>
            </Stack>

            <Divider>or</Divider>

            <Button
              variant="text"
              size="large"
              disabled={!isConfigured || !email || submitting}
              onClick={() =>
                runAction(
                  () => signInWithMagicLink(email),
                  'Magic link sent. Open the email on this device to finish signing in.',
                )
              }
            >
              Email Me a Magic Link
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
