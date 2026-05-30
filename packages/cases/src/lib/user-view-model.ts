import type { ParticipantSelectedDisplay, UserCompact } from "../types";

export function toParticipantSelectedDisplay(
  user: UserCompact,
): ParticipantSelectedDisplay {
  return {
    userId: user.client_id as string,
    username: user.username,
    profilePicture: user.profile_picture,
    roleName: user.role?.name ?? null,
  };
}
