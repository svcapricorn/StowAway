// StowAway Tracker - Dashboard Hero
// Navy hero band with kit status, headline metric and primary actions.

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Plus, Tags, Download, Ship } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';

type KitStatus = 'success' | 'warning' | 'error';

export function DashboardHero({ onExport }: { onExport: () => void }) {
  const { items, stats } = useInventory();

  const criticalCount = stats.expiredCount + stats.lowStockCount;

  const info: { status: KitStatus; icon: React.ReactNode; title: string; message: string } =
    criticalCount === 0 && stats.expiringSoonCount === 0
      ? {
          status: 'success',
          icon: <CheckCircle2 size={18} />,
          title: 'Your medical kit is shipshape',
          message:
            items.length > 0
              ? `All ${items.length} items are stocked and ready for sea.`
              : 'Add your first item to start tracking supplies aboard.',
        }
      : stats.expiredCount > 0 || stats.lowStockCount > 2
        ? {
            status: 'error',
            icon: <AlertCircle size={18} />,
            title: 'Attention needed before departure',
            message: `${criticalCount} item${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} restocking or replacement.`,
          }
        : {
            status: 'warning',
            icon: <AlertTriangle size={18} />,
            title: 'A few items to review',
            message: `${stats.expiringSoonCount + stats.lowStockCount} item${stats.expiringSoonCount + stats.lowStockCount > 1 ? 's' : ''} to check before your next passage.`,
          };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        p: { xs: 3, sm: 4 },
        color: 'primary.contrastText',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, hsl(210, 60%, 18%) 60%, hsl(200, 55%, 22%) 100%)`,
        boxShadow: '0 18px 40px -24px rgba(23, 42, 69, 0.65)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: -40,
          bottom: -50,
          opacity: 0.08,
          color: 'inherit',
          pointerEvents: 'none',
        }}
      >
        <Ship size={220} strokeWidth={1} />
      </Box>

      <Stack spacing={3} sx={{ position: 'relative' }}>
        <Stack spacing={1.5} alignItems="flex-start">
          <Chip
            icon={<Box sx={{ display: 'flex', color: 'inherit' }}>{info.icon}</Box>}
            label={
              info.status === 'success'
                ? 'Ready for sea'
                : info.status === 'warning'
                  ? 'Review advised'
                  : 'Action required'
            }
            size="small"
            sx={{
              bgcolor: (theme) =>
                `color-mix(in srgb, ${theme.palette[info.status].main} 32%, transparent)`,
              color: 'inherit',
              fontWeight: 600,
              border: (theme) =>
                `1px solid color-mix(in srgb, ${theme.palette[info.status].main} 60%, transparent)`,
              '& .MuiChip-icon': { color: 'inherit', ml: 0.75 },
            }}
          />

          <Typography variant="h4" sx={{ fontWeight: 600, lineHeight: 1.15, maxWidth: 520 }}>
            {info.title}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.78, maxWidth: 480 }}>
            {info.message}
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 0.5 }}>
          <Button
            component={Link}
            to="/add"
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<Plus />}
            sx={{ px: 3, fontWeight: 600 }}
          >
            Add Item
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              component={Link}
              to="/labels"
              variant="outlined"
              size="large"
              startIcon={<Tags size={18} />}
              sx={{
                color: 'inherit',
                borderColor: 'rgba(255,255,255,0.35)',
                '&:hover': { borderColor: 'inherit', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Labels
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onExport}
              disabled={items.length === 0}
              startIcon={<Download size={18} />}
              sx={{
                color: 'inherit',
                borderColor: 'rgba(255,255,255,0.35)',
                '&:hover': { borderColor: 'inherit', bgcolor: 'rgba(255,255,255,0.08)' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.15)' },
              }}
            >
              Export
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
