// StowAway Tracker - Metric Grid
// Four at-a-glance kit metrics under the dashboard hero.

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Clock, TrendingDown, CalendarX } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { Box, Paper, Stack, Typography } from '@mui/material';

type Metric = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'warning' | 'error' | 'secondary';
  to: string;
};

export function MetricGrid() {
  const { items, stats } = useInventory();

  const metrics: Metric[] = [
    { label: 'Items tracked', value: items.length, icon: <Package size={18} />, color: 'primary', to: '/inventory' },
    { label: 'Expiring soon', value: stats.expiringSoonCount, icon: <Clock size={18} />, color: 'warning', to: '/inventory' },
    { label: 'Low stock', value: stats.lowStockCount, icon: <TrendingDown size={18} />, color: 'secondary', to: '/inventory' },
    { label: 'Expired', value: stats.expiredCount, icon: <CalendarX size={18} />, color: 'error', to: '/inventory' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
      }}
    >
      {metrics.map((metric, index) => (
        <Paper
          key={metric.label}
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 * index }}
          variant="outlined"
          sx={{ p: 2.5, borderRadius: 3, height: '100%' }}
        >
          <Stack
            component={Link}
            to={metric.to}
            spacing={1.5}
            sx={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                color: `${metric.color}.main`,
                bgcolor: (theme) =>
                  `color-mix(in srgb, ${theme.palette[metric.color].main} 12%, transparent)`,
              }}
            >
              {metric.icon}
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, lineHeight: 1 }}>
              {metric.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {metric.label}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
