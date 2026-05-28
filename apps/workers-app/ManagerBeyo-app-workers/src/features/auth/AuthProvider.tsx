import type { ReactNode } from "react";
import { AuthProvider as BaseAuthProvider } from "@beyo/auth";
import { ROUTES } from "@/lib/routes";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps): React.JSX.Element {
  return (
    <BaseAuthProvider signInRoute={ROUTES.signIn}>{children}</BaseAuthProvider>
  );
}
