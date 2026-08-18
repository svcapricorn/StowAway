// StowAway Tracker - App Shell Layout
// Mobile-first responsive layout with bottom navigation

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Settings
} from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { StowAwayLogo } from '@/components/StowAwayLogo';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Badge, 
  BottomNavigation, 
  BottomNavigationAction, 
  Paper, 
  Box, 
  Container 
} from '@mui/material';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stats, isLoading } = useInventory();

  // Calculate if there are alerts to show badge
  const hasAlerts = !isLoading && (stats.lowStockCount > 0 || stats.expiringSoonCount > 0 || stats.expiredCount > 0);
  const alertCount = stats.lowStockCount + stats.expiringSoonCount + stats.expiredCount;

  // Determine active tab index
  const getValue = (path: string) => {
    if (path === '/') return 0;
    if (path.startsWith('/inventory')) return 1;
    if (path === '/add') return 2;
    if (path === '/settings') return 3;
    return 0;
  };

  const [value, setValue] = React.useState(getValue(location.pathname));

  React.useEffect(() => {
    setValue(getValue(location.pathname));
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Toolbar>
          <StowAwayLogo size={28} style={{ marginRight: 12 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            StowAway
          </Typography>
          
          {hasAlerts && (
            <Badge badgeContent={alertCount} color="error">
               <Typography
                 variant="caption"
                 aria-label={`${alertCount} inventory alerts need attention`}
                 sx={{ bgcolor: 'rgba(255,255,255,0.18)', px: 1, py: 0.5, borderRadius: 1 }}
               >
                 Alerts
               </Typography>
            </Badge>
          )}

        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container component="main" sx={{ flex: 1, pb: 10, pt: 2 }} maxWidth="md">
           <Outlet />
      </Container>

      {/* Legal Disclaimer */}
      <Box sx={{ position: 'fixed', bottom: 80, left: 0, right: 0, pointerEvents: 'none', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
          Organizational tool only • Not medical advice
        </Typography>
      </Box>

      {/* Bottom Navigation */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            switch(newValue) {
                case 0: navigate('/'); break;
                case 1: navigate('/inventory'); break;
                case 2: navigate('/add'); break;
                case 3: navigate('/settings'); break;
            }
          }}
        >
          <BottomNavigationAction label="Dashboard" icon={<LayoutDashboard size={24} />} />
          <BottomNavigationAction 
             label="Inventory" 
             icon={
                 <Badge color="error" variant="dot" invisible={!hasAlerts}>
                    <Package size={24} />
                 </Badge>
             } 
          />
          <BottomNavigationAction label="Add" icon={<Plus size={24} />} />
          <BottomNavigationAction label="Settings" icon={<Settings size={24} />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
