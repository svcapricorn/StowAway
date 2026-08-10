import { Outlet, Navigate } from 'react-router-dom';
import { CircularProgress, Box, Alert, AlertTitle } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = () => {
    const isMockAuth = import.meta.env.VITE_MOCK_AUTH === 'true';
    const { isAuthenticated, isConfigured, loading } = useAuth();

    if (isMockAuth) {
        return <Outlet />;
    }

    if (!isConfigured) {
        return (
            <Box sx={{ 
                display: 'flex', 
                height: '100vh', 
                justifyContent: 'center', 
                alignItems: 'center',
                p: 2
            }}>
                <Alert severity="warning">
                    <AlertTitle>Authentication Not Configured</AlertTitle>
                    Supabase authentication is enabled, but the frontend environment variables are missing.
                    <Box sx={{ mt: 1, fontSize: '0.85em', opacity: 0.9 }}>
                        Add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong>, then redeploy.
                    </Box>
                </Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
