import { LogOut } from 'lucide-react';

import { useSettingsViewContext } from '../providers/SettingsViewProvider';

export function SettingsView(): React.JSX.Element {
  const { signOut, isSigningOut } = useSettingsViewContext();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive disabled:opacity-60"
        data-testid="settings-sign-out-button"
        disabled={isSigningOut}
        onClick={signOut}
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        {isSigningOut ? 'Signing out…' : 'Log out'}
      </button>
    </div>
  );
}
