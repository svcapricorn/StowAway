// StowAway Tracker - Status Card Component
// Displays overall kit status with maritime-themed messaging

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Ship } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { Card, CardContent, Typography, Box, Stack, Divider } from '@mui/material';

type KitStatus = 'success' | 'warning' | 'error';

export function StatusCard() {
  const { stats, items } = useInventory();

  const getStatusInfo = (): { status: KitStatus, icon: React.ReactNode, title: string, message: string } => {
    const criticalCount = stats.expiredCount + stats.lowStockCount;
    const warningCount = stats.expiringSoonCount + stats.lowStockCount;

    if (criticalCount === 0 && stats.expiringSoonCount === 0) {
      return {
        status: 'success',
        icon: <CheckCircle2 size={32} />,
        title: 'Your medical kit is shipshape',
        message: items.length > 0 
          ? `All ${items.length} items are stocked and ready for sea.`
          : 'Add items to start tracking your medical supplies.',
      };
    }

    if (stats.expiredCount > 0 || (stats.lowStockCount > 0 && stats.lowStockCount > 2)) {
      return {
        status: 'error',
        icon: <AlertCircle size={32} />,
        title: 'Attention needed before departure',
        message: `${criticalCount} item${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} restocking or replacement.`,
      };
    }

    return {
      status: 'warning',
      icon: <AlertTriangle size={32} />,
      title: 'A few items to review',
      message: `${warningCount} item${warningCount > 1 ? 's' : ''} to check before your next passage.`,
    };
  };

  const info = getStatusInfo();
  
  // Map internal status to MUI palette colors
  const getColor = (status: KitStatus) => {
      switch(status) {
          case 'success': return 'success';
          case 'warning': return 'warning';
          case 'error': return 'error';
      }
  };

  const color = getColor(info.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        variant="outlined" 
        sx={{ 
            bgcolor: (theme) => `color-mix(in srgb, ${theme.palette[color].main} 8%, ${theme.palette.background.paper})`,
            borderColor: (theme) => `color-mix(in srgb, ${theme.palette[color].main} 30%, transparent)`,
            position: 'relative',
            overflow: 'hidden'
        }}
      >
        <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ color: `${color}.main` }}>{info.icon}</Box>
                <Box sx={{ flex: 1, zIndex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {info.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {info.message}
                    </Typography>
                </Box>
                <Box sx={{ opacity: 0.1, color: 'text.primary' }}>
                    <Ship size={48} />
                </Box>
            </Stack>

           <Divider sx={{ my: 2, opacity: 0.5 }} />

           <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Stack direction="row" spacing={1} alignItems="center">
                   <Typography variant="body2" fontWeight="bold">{items.length}</Typography>
                   <Typography variant="body2" color="text.secondary">items tracked</Typography>
               </Stack>

               {stats.expiringSoonCount > 0 && (
                 <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'warning.main' }}>
                     <Typography variant="body2" fontWeight="bold">{stats.expiringSoonCount}</Typography>
                     <Typography variant="body2">expiring soon</Typography>
                 </Stack>
               )}
           </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
}
