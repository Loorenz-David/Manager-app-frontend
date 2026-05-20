import { z } from 'zod';

import type { UserId } from '@/types/common';

export const SelfProfileSchema = z.object({
  id: z.string().transform((v) => v as UserId),
  username: z.string(),
  email: z.string(),
  phone_number: z.string().nullable(),
  languages: z.string().nullable(),
  language_preference: z.string().nullable(),
  profile_picture: z.string().nullable(),
  online: z.boolean(),
  last_online: z.string().datetime({ offset: true }).nullable(),
});
export type SelfProfile = z.infer<typeof SelfProfileSchema>;

export const CurrentViewRecordSchema = z.object({
  entity_type: z.string(),
  entity_client_id: z.string().nullable(),
  started_at: z.string().datetime({ offset: true }),
});
export type CurrentViewRecord = z.infer<typeof CurrentViewRecordSchema>;

export const UpdateSelfProfileInputSchema = z.object({
  username: z.string().min(1, 'Username is required.').optional(),
  email: z.string().email('Enter a valid email.').optional(),
  phone_number: z.string().nullable().optional(),
  language_preference: z.string().optional(),
});
export type UpdateSelfProfileInput = z.infer<typeof UpdateSelfProfileInputSchema>;

export const UpdateSelfPasswordInputSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm_password: z.string().min(1),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });
export type UpdateSelfPasswordInput = z.infer<typeof UpdateSelfPasswordInputSchema>;

export const RecordViewEventInputSchema = z.object({
  entity_type: z.string().min(1),
  entity_client_id: z.string().nullable(),
});
export type RecordViewEventInput = z.infer<typeof RecordViewEventInputSchema>;

export type ListViewRecordsParams = {
  limit?: number;
  offset?: number;
};

export type SelfProfileViewModel = SelfProfile & {
  display_name: string;
  initial: string;
  has_profile_pic: boolean;
};

export function toSelfProfileViewModel(profile: SelfProfile): SelfProfileViewModel {
  return {
    ...profile,
    display_name: profile.username,
    initial: profile.username.charAt(0).toUpperCase(),
    has_profile_pic: Boolean(profile.profile_picture),
  };
}
