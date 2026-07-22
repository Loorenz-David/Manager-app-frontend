import { SignInForm } from "@beyo/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/routes";

type RedirectLocation = {
  pathname?: string;
  search?: string;
  hash?: string;
};

type SignInLocationState = {
  from?: RedirectLocation;
};

export function SignInPage(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SignInLocationState | null;

  const handleSuccess = (): void => {
    const from = state?.from;
    const destination = from?.pathname
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : ROUTES.home;
    navigate(destination, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-sm">
        {/* Exact 100px gap requested between the heading block and the form card. */}
        <div className="absolute bottom-full left-1/2 mb-[50px] w-full -translate-x-1/2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Presentation Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with a manager or administrator account
          </p>
        </div>

        <div className="w-full rounded-2xl border border-border bg-white p-6 shadow-sm">
          <SignInForm appScope="manager" onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
