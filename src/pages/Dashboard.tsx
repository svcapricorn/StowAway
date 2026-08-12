// StowAway Tracker - Dashboard Page
// Main overview page with status and alerts

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Download, FileText, Tags } from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { Button, Stack, Typography, Box, Skeleton } from '@mui/material';

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
      <Stack spacing={2} sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ py: 3 }}>
      {/* Status Overview */}
      <StatusCard />

      {/* Quick Actions */}
      <Stack direction="row" spacing={2}>
        <Button 
          component={Link} 
          to="/add" 
          variant="contained" 
          color="secondary" 
          fullWidth
          size="large"
          startIcon={<Plus />}
        >
          Add Item
        </Button>
        <Button
          component={Link}
          to="/labels"
          variant="outlined"
          size="large"
          sx={{ minWidth: 64 }}
          title="Location labels"
        >
          <Tags />
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={handleExport}
          disabled={items.length === 0}
          sx={{ minWidth: 64 }}
        >
          <Download />
        </Button>
      </Stack>

      {/* Alerts Section */}
      <Box>
        <Typography variant="h6" gutterBottom>Alerts</Typography>
        <AlertsList />
      </Box>

      {/* Category Stats */}
      <Box>
        <QuickStats />
      </Box>

      {/* Regulatory Templates Link */}
      {items.length > 0 && (
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
        >
          <Box 
            component={Link} 
            to="/templates"
            sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 2, 
                boxShadow: 1,
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': { boxShadow: 3, bgcolor: 'action.hover' }
            }}
          >
            <Box sx={{ p: 1, bgcolor: 'action.selected', borderRadius: 1, display: 'flex' }}>
              <FileText size={24} />
            </Box>
            <Box>
               <Typography variant="subtitle1" fontWeight="bold">Regulatory Templates</Typography>
               <Typography variant="body2" color="text.secondary">Compare with USCG, RYA, and WHO guidelines</Typography>
            </Box>
          </Box>
        </motion.div>
      )}
      
      {/* Disclaimer */}
      <Box sx={{ textAlign: 'center', py: 2, maxWidth: 400, mx: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          StowAway is an organizational tool only. It does not provide medical advice, 
          diagnosis, or treatment recommendations.
        </Typography>
      </Box>
    </Stack>
  );
}
