import type { ComponentType } from 'react';
import { Archive, Armchair, Sofa, Table } from 'lucide-react';

export type ItemCategoryOptionRecord = {
  client_id: string;
  name: string;
  major_category: string;
  icon?: ComponentType<{ className?: string }>;
};

export type ItemIssueOptionRecord = {
  client_id: string;
  name: string;
};

export type IssueSeverityOptionRecord = {
  client_id: string;
  name: string;
  time_multiplier: number;
};

export const TEST_ITEM_CATEGORIES: ItemCategoryOptionRecord[] = [
  {
    client_id: 'cat_wood_table',
    name: 'Table',
    major_category: 'wood',
    icon: Table,
  },
  {
    client_id: 'cat_wood_cabinet',
    name: 'Cabinet',
    major_category: 'wood',
    icon: Archive,
  },
  {
    client_id: 'cat_seat_chair',
    name: 'Chair',
    major_category: 'seat',
    icon: Armchair,
  },
  {
    client_id: 'cat_seat_sofa',
    name: 'Sofa',
    major_category: 'seat',
    icon: Sofa,
  },
];

export const TEST_ITEM_ISSUES: ItemIssueOptionRecord[] = [
  { client_id: 'issue_scratches', name: 'Scratches' },
  { client_id: 'issue_stains', name: 'Stains' },
  { client_id: 'issue_broken_leg', name: 'Broken leg' },
];

export const TEST_ISSUE_SEVERITIES: IssueSeverityOptionRecord[] = [
  { client_id: 'severity_low', name: 'Low', time_multiplier: 1 },
  { client_id: 'severity_medium', name: 'Medium', time_multiplier: 1.5 },
  { client_id: 'severity_high', name: 'High', time_multiplier: 2 },
];
