import { useAuth } from "@beyo/auth";
import { Outlet } from "react-router-dom";

export function AppShell(): React.JSX.Element {
  const { isSigningOut, signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-muted">
      <header className="flex h-16 items-center justify-between border-b bg-background px-8 shadow-sm">
        <div className="flex items-baseline gap-3">
          <span className="text-base font-semibold text-foreground">ManagerBeyo</span>
          <span className="text-sm text-muted-foreground">Presentation Studio</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.username}</span>
          <button
            type="button"
            className="rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            disabled={isSigningOut}
            onClick={() => signOut()}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  );
}
