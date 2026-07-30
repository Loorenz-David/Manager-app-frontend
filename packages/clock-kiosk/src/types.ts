import type { FloorRosterUser } from '@beyo/worker-shifts';

export type ScheduledShiftDisplay = {
  label: string;
  value: string;
} | null;

export type KioskAnnouncement = {
  id: string;
  title: string;
  dateLabel: string;
};

export type KioskAdapters = {
  getScheduledShift: (user: FloorRosterUser) => ScheduledShiftDisplay;
  getAnnouncements: (user: FloorRosterUser) => KioskAnnouncement[];
};
