import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { selectUser, useAuthStore } from "@beyo/auth";

import { listUsers } from "../api/list-users";
import { userKeys } from "../api/user-keys";
import type { ParticipantSelectionResult } from "../types";
import { PARTICIPANT_AUTO_SELECT_RULES } from "./participant-auto-select-rules";
import { toParticipantSelectedDisplay } from "./user-view-model";

// Limit is intentionally bounded for client-side role filtering in creation flow.
const AUTO_SELECT_FETCH_PARAMS = { limit: 200, compact: true as const };

export function useParticipantAutoSelect(): ParticipantSelectionResult | null {
  const user = useAuthStore(selectUser);

  const targetRoles = useMemo(() => {
    if (!user?.role) {
      return [];
    }

    return PARTICIPANT_AUTO_SELECT_RULES[user.role.toLowerCase()] ?? [];
  }, [user?.role]);

  const { data, isSuccess } = useQuery({
    queryKey: userKeys.list(AUTO_SELECT_FETCH_PARAMS),
    queryFn: () => listUsers(AUTO_SELECT_FETCH_PARAMS),
    enabled: targetRoles.length > 0,
  });

  return useMemo(() => {
    if (targetRoles.length === 0 || !isSuccess || !data) {
      return null;
    }

    const targetRoleSet = new Set(targetRoles);
    const filteredUsers = data.users.filter(
      (userItem) =>
        userItem.role?.name != null &&
        targetRoleSet.has(userItem.role.name.toLowerCase()),
    );

    if (filteredUsers.length === 0) {
      return null;
    }

    return {
      participants: filteredUsers.map(
        (userItem) => userItem.client_id as string,
      ),
      selectedAll: false,
      skipParticipants: [],
      selectedUsers: filteredUsers.map(toParticipantSelectedDisplay),
      totalCount: filteredUsers.length,
    };
  }, [targetRoles, isSuccess, data]);
}
