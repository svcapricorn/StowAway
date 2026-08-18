// StowAway Tracker - Dashboard Page
// Hero + grid overview: kit status, key metrics, alerts and categories.

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ChevronRight } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { MetricGrid } from '@/components/dashboard/MetricGrid';
import { Box, Paper, Stack, Typography, Skeleton } from '@mui/material';

export default function Dashboard() {
  const { items, exportToCSV, isLoading } = useInventory();

  const handleExport = () => {
    if (items.length === 0) {
      alert('No items to export. Add some items to your inventory first.');
      return;
    }

    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stowaway-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Export complete. Your inventory has been exported to CSV.');
  };

  if (isLoading) {
    return (
      <Stack spacing={3} sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 4 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={4} sx={{ py: 3 }}>
      <DashboardHero onExport={handleExport} />

      <MetricGrid />

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
          Alerts
        </Typography>
        <AlertsList />
      </Box>

      <QuickStats />

      {items.length > 0 && (
        <Paper
          component={motion.div}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          variant="outlined"
          sx={{ borderRadius: 3, overflow: 'hidden' }}
        >
          <Stack
            component={Link}
            to="/templates"
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              p: 2.5,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background-color 150ms ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                p: 1.25,
                borderRadius: 2,
                color: 'secondary.main',
                bgcolor: (theme) => `color-mix(in srgb, ${theme.palette.secondary.main} 12%, transparent)`,
              }}
            >
              <FileText size={22} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Regulatory Templates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compare your kit with USCG, RYA, and WHO guidelines
              </Typography>
            </Box>
            <ChevronRight size={18} style={{ opacity: 0.5, flexShrink: 0 }} />
          </Stack>
        </Paper>
      )}

      <Box sx={{ textAlign: 'center', py: 1, maxWidth: 440, mx: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          StowAway is an organizational tool only. It does not provide medical advice,
          diagnosis, or treatment recommendations.
        </Typography>
      </Box>
    </Stack>
  );
}
