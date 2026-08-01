import type { SocketEventHandlers } from "@beyo/realtime";
import { WORKER_SHIFT_SELF_SCOPE, workerShiftKeys } from "./api/worker-shift-keys";
import { CurrentShiftSchema } from "./types";

/**
 * `worker-shift:state-changed` is delivered on the `user:{id}` room, so it only
 * ever describes **you** — a manager declaring a break on your behalf, the
 * overnight safeguard closing a forgotten shift, the external clock integration,
 * or your own step transition moving you between working/idle/paused.
 *
 * The payload is byte-for-byte the `GET /worker-shifts/current` body, so this
 * writes it into the cache instead of invalidating: no request, and the state
 * card's live timer re-anchors to the server's `state_entered_at` rather than to
 * a fetch time.
 */
export const workerShiftSocketEvents: SocketEventHandlers = {
  "worker-shift:state-changed": (payload, { queryClient }) => {
    const selfKey = workerShiftKeys.current({
      user_id: WORKER_SHIFT_SELF_SCOPE,
    });
    const parsed = CurrentShiftSchema.safeParse(payload);

    // Contract drift must self-heal, not freeze the card on stale data: fall
    // back to the network read the payload was meant to save us.
    if (!parsed.success) {
      queryClient.invalidateQueries({
        queryKey: selfKey,
        refetchType: "active",
      });
      return;
    }

    queryClient.setQueryData(selfKey, parsed.data);

    // The same shift also lives under a `{ user_id }` scope when something reads
    // a specific worker (a manager view, the kiosk). Refresh that entry only if
    // it already exists — writing unconditionally would mint cache entries
    // nothing observes.
    const userKey = workerShiftKeys.current({ user_id: parsed.data.user_id });
    if (queryClient.getQueryState(userKey)) {
      queryClient.setQueryData(userKey, parsed.data);
    }
  },
};
