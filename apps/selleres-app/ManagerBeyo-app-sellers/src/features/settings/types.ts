import type { PushSubscriptionStatus } from "@beyo/notifications";

export type SettingsState = {
  signOut: () => void;
  isSigningOut: boolean;
  pushStatus: PushSubscriptionStatus;
  isPushLoading: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
};
