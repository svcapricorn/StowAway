// SailMed Tracker - Inventory List Component
// Displays all inventory items with filtering and search

import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Package,
  ChevronRight,
  Calendar,
  MapPin,
  X
} from 'lucide-react';
import { useInventory } from '@/context/InventoryContext';
import { CATEGORY_INFO, LOCATION_INFO, ItemCategory, InventoryItem, StorageLocation } from '@/types';
import {
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Box,
  Typography,
  Card,
  CardActionArea,
  Avatar,
  IconButton,
  Button
} from '@mui/material';
import { format, differenceInDays } from 'date-fns';

type FilterType = 'all' | 'alerts' | ItemCategory;

const LEGACY_LOCATIONS = ['main-cabin', 'cockpit', 'nav-station', 'forepeak', 'lazarette', 'deck-locker'];

export function InventoryList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, stats } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeFilter = (searchParams.get('category') || searchParams.get('filter') || 'all') as FilterType;
  const activeLocation = searchParams.get('location') as StorageLocation | null;

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (activeLocation && LOCATION_INFO[activeLocation]) {
      result = result.filter(item => item.location === activeLocation);
    }

    // Apply category/filter
    if (activeFilter === 'alerts') {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      result = result.filter(item => {
        const isExpired = item.expirationDate && new Date(item.expirationDate) < now;
        const isExpiringSoon = item.expirationDate && 
          new Date(item.expirationDate) >= now && 
          new Date(item.expirationDate) <= thirtyDays;
        const isLowStock = item.quantity <= item.minQuantity;
        return isExpired || isExpiringSoon || isLowStock;
      });
    } else if (activeFilter !== 'all' && Object.keys(CATEGORY_INFO).includes(activeFilter)) {
      result = result.filter(item => item.category === activeFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query) ||
        CATEGORY_INFO[item.category].label.toLowerCase().includes(query)
      );
    }

    // Sort by status (critical first), then name
    result.sort((a, b) => {
      const statusOrder = (item: InventoryItem): number => {
        const now = new Date();
        if (item.expirationDate && new Date(item.expirationDate) < now) return 0;
        if (item.quantity <= item.minQuantity) return 1;
        if (item.expirationDate) {
          const daysUntil = differenceInDays(new Date(item.expirationDate), now);
          if (daysUntil <= 30) return 2;
        }
        return 3;
      };
      
      const statusDiff = statusOrder(a) - statusOrder(b);
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [items, activeFilter, activeLocation, searchQuery]);

  const filterOptions: { value: FilterType; label: string; count?: number }[] = [
    { value: 'all', label: 'All Items', count: items.length },
    { value: 'alerts', label: 'Needs Attention', count: stats.lowStockCount + stats.expiringSoonCount + stats.expiredCount },
    ...Object.entries(CATEGORY_INFO).map(([key, info]) => ({
      value: key as ItemCategory,
      label: info.label,
      count: stats.categoryCounts[key as ItemCategory],
    })),
  ];

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
  };

  const locationFilterOptions = Object.entries(LOCATION_INFO)
    .filter(([key]) => !LEGACY_LOCATIONS.includes(key))
    .map(([value, info]) => ({
      value: value as StorageLocation,
      label: info.label,
      count: items.filter(i => i.location === value).length,
    }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Search Bar */}
      <TextField
        placeholder="Search supplies..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        fullWidth
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={20} color="gray" />
            </InputAdornment>
          ),
          sx: { bgcolor: 'background.paper' }
        }}
      />

      {/* Filter Pills */}
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, px: 0.5 }}>
        {filterOptions.map(({ value, label, count }) => (
          <Chip
            key={value}
            label={count !== undefined && count > 0 ? `${label} (${count})` : label}
            onClick={() => {
              if (value === 'all') {
                setSearchParams({});
              } else if (value === 'alerts') {
                setSearchParams({ filter: 'alerts' });
              } else {
                setSearchParams({ category: value });
              }
            }}
            color={activeFilter === value ? 'primary' : 'default'}
            variant={activeFilter === value ? 'filled' : 'outlined'}
            clickable
          />
        ))}
      </Stack>

      {/* Location filter (from scan or tap) */}
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, px: 0.5 }}>
        {locationFilterOptions.map(({ value, label, count }) => (
          <Chip
            key={value}
            icon={<MapPin size={14} />}
            label={count > 0 ? `${label} (${count})` : label}
            onClick={() => {
              if (activeLocation === value) {
                const params = new URLSearchParams(searchParams);
                params.delete('location');
                setSearchParams(params);
              } else {
                const params = new URLSearchParams(searchParams);
                params.set('location', value);
                setSearchParams(params);
              }
            }}
            color={activeLocation === value ? 'secondary' : 'default'}
            variant={activeLocation === value ? 'filled' : 'outlined'}
            clickable
            size="small"
          />
        ))}
      </Stack>

      {/* Active Filters Banner */}
      {(activeFilter !== 'all' || activeLocation || searchQuery) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Showing {filteredItems.length} of {items.length} items
            {activeLocation && LOCATION_INFO[activeLocation] && (
              <> in {LOCATION_INFO[activeLocation].label}</>
            )}
          </Typography>
          <Button
            size="small"
            onClick={clearFilters}
            startIcon={<X size={14} />}
            sx={{ textTransform: 'none' }}
          >
            Clear
          </Button>
        </Box>
      )}

      {/* Items List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <Box textAlign="center" py={4} sx={{ opacity: 0.7 }}>
              <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <Typography color="text.secondary">
                {items.length === 0
                  ? "No items in your inventory yet."
                  : "No items match your search."}
              </Typography>
              {items.length === 0 && (
                <Link to="/add" style={{ textDecoration: 'none' }}>
                  <Button sx={{ mt: 2 }}>Add your first item →</Button>
                </Link>
              )}
            </Box>
          ) : (
            filteredItems.map((item, index) => (
              <InventoryItemCard key={item.id} item={item} index={index} />
            ))
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

interface InventoryItemCardProps {
  item: InventoryItem;
  index: number;
}

function InventoryItemCard({ item, index }: InventoryItemCardProps) {
  const navigate = useNavigate();
  const now = new Date();
  const isExpired = item.expirationDate && new Date(item.expirationDate) < now;
  const isLowStock = item.quantity <= item.minQuantity;
  
  let daysUntilExpiry: number | null = null;
  if (item.expirationDate && !isExpired) {
    daysUntilExpiry = differenceInDays(new Date(item.expirationDate), now);
  }
  
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;
  const hasAlert = isExpired || isLowStock || isExpiringSoon;

  // Determine border color/status
  let statusColor = 'transparent';
  if (isExpired) statusColor = 'error.main';
  else if (isLowStock) statusColor = 'warning.main';
  else if (isExpiringSoon) statusColor = 'secondary.main';

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 1,
        borderLeft: hasAlert ? 4 : 1,
        borderLeftColor: hasAlert ? statusColor : 'divider'
      }}
    >
      <CardActionArea onClick={() => navigate(`/inventory/${item.id}`)} sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          {/* Category indicator (Avatar) */}
          <Avatar sx={{ bgcolor: 'action.selected', color: 'text.primary' }}>
            <Package size={20} />
          </Avatar>

          {/* Item info */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" noWrap fontWeight={500}>{item.name}</Typography>
              {hasAlert && (
                 <Chip 
                   label={isExpired ? 'Expired' : isLowStock ? 'Low' : 'Expiring'} 
                   size="small" 
                   color={isExpired ? 'error' : isLowStock ? 'warning' : 'info'}
                   sx={{ height: 20, fontSize: '0.7rem' }} 
                 />
              )}
            </Box>
            
            <Stack direction="row" spacing={2} mt={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                <Package size={12} /> Qty: {item.quantity} {item.remaining && `• ${item.remaining}`}
              </Typography>
              {item.expirationDate && (
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                  <Calendar size={12} /> {format(new Date(item.expirationDate), 'MMM yyyy')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} noWrap>
                <MapPin size={12} /> {LOCATION_INFO[item.location]?.label || item.location}
              </Typography>
            </Stack>
          </Box>

          <ChevronRight size={20} color="gray" />
        </Box>
      </CardActionArea>
    </Card>
  );
}
