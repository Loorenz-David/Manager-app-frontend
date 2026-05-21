import type { UpholsteryPickerRecord } from '@/features/upholstery/types';

export const TEST_UPHOLSTERIES: UpholsteryPickerRecord[] = [
  {
    client_id: 'uph_linen_natural',
    name: 'Natural Linen',
    code: 'LN-001',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=80&h=80&fit=crop',
    current_available_amount_meters: 12.5,
  },
  {
    client_id: 'uph_velvet_midnight',
    name: 'Midnight Velvet',
    code: 'VL-002',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=80&h=80&fit=crop',
    current_available_amount_meters: 3.2,
  },
  {
    client_id: 'uph_cotton_offwhite',
    name: 'Off-White Cotton',
    code: 'CT-003',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=80&h=80&fit=crop',
    current_available_amount_meters: 8,
  },
  {
    client_id: 'uph_leather_tan',
    name: 'Tan Leather',
    code: 'LT-004',
    image: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=80&h=80&fit=crop',
    current_available_amount_meters: 20.75,
  },
  {
    client_id: 'uph_wool_charcoal',
    name: 'Charcoal Wool',
    code: null,
    image: 'https://images.unsplash.com/photo-1549497538-303791108f95?w=80&h=80&fit=crop',
    current_available_amount_meters: 0.4,
  },
];
