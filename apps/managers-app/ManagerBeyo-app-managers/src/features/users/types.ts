import { z } from 'zod';

import type { UserId } from '@/types/common';

export const UserSchema = z.object({
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
export type User = z.infer<typeof UserSchema>;

export const LivePresenceSchema = z.object({
  user_id: z.string().transform((v) => v as UserId),
  online: z.boolean(),
  last_online: z.string().datetime({ offset: true }).nullable(),
});
export type LivePresence = z.infer<typeof LivePresenceSchema>;

export const UpdateUserAdminInputSchema = z.object({
  id: z.string().transform((v) => v as UserId),
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().nullable().optional(),
});
export type UpdateUserAdminInput = z.infer<typeof UpdateUserAdminInputSchema>;

export const DeactivateUserInputSchema = z.object({
  id: z.string().transform((v) => v as UserId),
});
export type DeactivateUserInput = z.infer<typeof DeactivateUserInputSchema>;

export const AssignWorkingSectionsInputSchema = z.object({
  user_id: z.string().transform((v) => v as UserId),
  working_section_ids: z.array(z.string().min(1)).min(1),
});
export type AssignWorkingSectionsInput = z.infer<typeof AssignWorkingSectionsInputSchema>;

export const UnassignWorkingSectionsInputSchema = z.object({
  user_id: z.string().transform((v) => v as UserId),
  working_section_ids: z.array(z.string().min(1)).min(1),
});
export type UnassignWorkingSectionsInput = z.infer<typeof UnassignWorkingSectionsInputSchema>;

export type ListUsersParams = {
  limit?: number;
  offset?: number;
};

export type UserViewModel = User & {
  display_name: string;
  initial: string;
  online_status: 'online' | 'offline' | 'away';
  has_profile_pic: boolean;
};

export function toUserViewModel(user: User): UserViewModel {
  const now = Date.now();
  const lastOnlineMs = user.last_online ? new Date(user.last_online).getTime() : null;
  const minutesSinceActive = lastOnlineMs ? (now - lastOnlineMs) / 60_000 : null;

  const onlineStatus: UserViewModel['online_status'] = user.online
    ? 'online'
    : minutesSinceActive !== null && minutesSinceActive < 60
      ? 'away'
      : 'offline';

  return {
    ...user,
    display_name: user.username,
    initial: user.username.charAt(0).toUpperCase(),
    online_status: onlineStatus,
    has_profile_pic: Boolean(user.profile_picture),
  };
}
