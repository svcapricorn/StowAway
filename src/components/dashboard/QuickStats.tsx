// StowAway Tracker - Quick Stats Component
// Displays category breakdown and quick numbers

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Cross, 
  Pill, 
  Stethoscope, 
  AlertTriangle, 
  Droplets,
  Package,
  Activity,
  Shield
} from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { CATEGORY_INFO, ItemCategory } from '@/types';
import { 
    Grid, 
    Paper, 
    Typography, 
    Stack, 
    Box, 
    Button 
} from '@mui/material';

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  'first-aid': <Cross size={20} />,
  'medications': <Pill size={20} />,
  'tools': <Stethoscope size={20} />,
  'emergency': <AlertTriangle size={20} />,
  'hygiene': <Droplets size={20} />,
  'diagnostic': <Activity size={20} />,
  'ppe': <Shield size={20} />,
  'other': <Package size={20} />,
};

export function QuickStats() {
  const { stats, items } = useInventory();

  if (items.length === 0) {
    return null;
  }

  const activeCategories = Object.entries(stats.categoryCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">By Category</Typography>
        <Button component={Link} to="/inventory" size="small" color="secondary">
          View all
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {activeCategories.map(([category, count], index) => (
          <Grid item xs={6} key={category}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <Paper 
                    component={Link}
                    to={`/inventory?category=${category}`}
                    sx={{ 
                        p: 2, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        textDecoration: 'none', 
                        color: 'inherit',
                        position: 'relative',
                        '&:hover': { bgcolor: 'action.hover' },
                        height: '100%'
                    }}
                    variant="outlined"
                >
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        width: 40, 
                        height: 40, 
                        bgcolor: 'primary.light', 
                        color: 'primary.contrastText',
                        borderRadius: 1,
                        opacity: 0.8
                    }}>
                        {categoryIcons[category as ItemCategory]}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                         <Typography variant="body2" fontWeight="bold" noWrap>
                             {CATEGORY_INFO[category as ItemCategory].label}
                         </Typography>
                         <Typography variant="caption" color="text.secondary">
                             {count} item{count !== 1 ? 's' : ''}
                         </Typography>
                    </Box>
                </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
