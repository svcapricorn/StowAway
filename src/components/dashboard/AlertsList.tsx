// StowAway Tracker - Alerts List Component
// Displays actionable alerts in a calm, non-alarmist way

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { CATEGORY_INFO } from '@/types';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Typography, 
  Paper, 
  Chip, 
  Stack, 
  Box,
  Divider,
  Grid
} from '@mui/material';

interface AlertSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  variant: 'critical' | 'warning' | 'info';
  items: Array<{
    id: string;
    name: string;
    category: string;
    detail: string;
  }>;
}

function AlertSection({ title, subtitle, icon, variant, items }: AlertSectionProps) {
    const getColor = () => {
        if (variant === 'critical') return 'error';
        if (variant === 'warning') return 'warning';
        return 'info'; // or secondary
    };

    const color = getColor();

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <Paper variant="outlined" sx={{ overflow: 'hidden', borderLeft: 4, borderColor: `${color}.main` }}>
                <Box sx={{ p: 2, bgcolor: (theme) => `color-mix(in srgb, ${theme.palette[color].main} 8%, ${theme.palette.background.paper})` }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
                            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                        </Box>
                        <Chip label={items.length} size="small" color={color} variant="outlined" />
                    </Stack>
                </Box>
                <List disablePadding>
                    {items.slice(0, 3).map((item, i) => (
                        <React.Fragment key={item.id}>
                            {i > 0 && <Divider component="li" />}
                            <ListItem disablePadding>
                                <ListItemButton component={Link} to={`/item/${item.id}`}>
                                    <Grid container alignItems="center" spacing={1}>
                                      <Grid item xs>
                                        <ListItemText 
                                            primary={item.name} 
                                            secondary={item.category}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                      </Grid>
                                      <Grid item>
                                        <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                                      </Grid>
                                      <Grid item>
                                        <ChevronRight size={16} style={{ opacity: 0.5 }} />
                                      </Grid>
                                    </Grid>
                                </ListItemButton>
                            </ListItem>
                        </React.Fragment>
                    ))}
                    
                    {items.length > 3 && (
                       <>
                        <Divider />
                        <ListItemButton component={Link} to="/inventory?filter=alerts" sx={{ justifyContent: 'center' }}>
                            <Typography variant="body2" color="secondary">
                                View all {items.length} items →
                            </Typography>
                        </ListItemButton>
                       </>
                    )}
                </List>
            </Paper>
        </motion.div>
    );
}

export function AlertsList() {
  const { getLowStockItems, getExpiringSoonItems, getExpiredItems } = useInventory();

  const lowStock = getLowStockItems();
  const expiringSoon = getExpiringSoonItems(30);
  const expired = getExpiredItems();

  const hasNoAlerts = lowStock.length === 0 && expiringSoon.length === 0 && expired.length === 0;

  if (hasNoAlerts) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Box sx={{ 
            display: 'inline-flex', 
            p: 2, 
            borderRadius: '50%', 
            bgcolor: 'success.light',
            color: 'success.contrastText',
            mb: 2,
            opacity: 0.8
        }}>
           <Package size={24} />
        </Box>
        <Typography color="text.secondary">
          No alerts — your supplies are in good order.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Expired Items - Most urgent */}
      {expired.length > 0 && (
        <AlertSection
          title="Expired items"
          subtitle="Replace before departure"
          icon={<AlertTriangle size={20} />}
          variant="critical"
          items={expired.map(item => ({
            id: item.id,
            name: item.name,
            category: CATEGORY_INFO[item.category].label,
            detail: `Expired ${formatDistanceToNow(new Date(item.expirationDate!), { addSuffix: true })}`,
          }))}
        />
      )}

      {/* Low Stock Items */}
      {lowStock.length > 0 && (
        <AlertSection
          title="Low stock"
          subtitle="Better to restock before landfall"
          icon={<Package size={20} />}
          variant="warning"
          items={lowStock.map(item => ({
            id: item.id,
            name: item.name,
            category: CATEGORY_INFO[item.category].label,
            detail: `${item.quantity} of ${item.minQuantity} minimum`,
          }))}
        />
      )}

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <AlertSection
          title="Expiring soon"
          subtitle="Plan to replace on next provisioning"
          icon={<Clock size={20} />}
          variant="info"
          items={expiringSoon.map(item => {
            const daysUntil = differenceInDays(new Date(item.expirationDate!), new Date());
            return {
              id: item.id,
              name: item.name,
              category: CATEGORY_INFO[item.category].label,
              detail: daysUntil <= 7 
                ? `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                : `Expires ${format(new Date(item.expirationDate!), 'MMM d, yyyy')}`,
            };
          })}
        />
      )}
    </Stack>
  );
}
