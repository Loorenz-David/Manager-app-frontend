import { usePushSubscription } from "@beyo/notifications";

export function PushMount(): null {
  usePushSubscription();

  return null;
}
