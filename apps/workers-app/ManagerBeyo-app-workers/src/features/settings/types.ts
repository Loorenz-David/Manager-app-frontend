import type { PushSubscriptionStatus } from "@beyo/notifications";

export type SettingsState = {
  signOut: () => void;
  isSigningOut: boolean;
  /** The last sign-out failed; the user is still signed in. */
  signOutError: string | null;
  pushStatus: PushSubscriptionStatus;
  isPushLoading: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
};
