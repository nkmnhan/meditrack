import { useEffect, type ReactNode } from "react";
import { useAuth } from "react-oidc-context";

interface ProtectedRouteProps {
  readonly children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth();
  const { signinRedirect, activeNavigator } = auth;

  useEffect(() => {
    // Don't trigger signinRedirect during an active signout — otherwise the
    // new navigation cancels the in-progress signoutRedirect and the user
    // gets auto-signed-back-in because the Identity Server session is never cleared.
    if (!auth.isLoading && !auth.isAuthenticated && !auth.error && !activeNavigator) {
      signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error, activeNavigator, signinRedirect]);

  if (auth.isLoading || activeNavigator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-lg text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-lg text-error-600">Authentication error</p>
          <p className="mt-1 text-sm text-neutral-500">{auth.error.message}</p>
          <button
            className="mt-4 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"
            onClick={() => auth.signinRedirect()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-lg text-neutral-500">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
