import { useNavigate } from "react-router-dom";
import { SignInForm } from "@beyo/auth";
import { RouteErrorBoundary } from "@/components/ui/RouteErrorBoundary";
import { ROUTES } from "@/lib/routes";

export function SignInPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="relative w-full max-w-sm">
          <div className="absolute bottom-full left-1/2 mb-[50px] w-full -translate-x-1/2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Seller Beyo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your workspace
            </p>
          </div>
          <div className="w-full rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SignInForm
              appScope="seller"
              onSuccess={() => navigate(ROUTES.home, { replace: true })}
            />
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
