import type { ReactNode } from "react";
import { useAuth } from "react-oidc-context";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500">Loading...</p>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-red-600">Authentication error</p>
          <p className="mt-1 text-sm text-gray-500">{auth.error.message}</p>
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
    auth.signinRedirect();
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
