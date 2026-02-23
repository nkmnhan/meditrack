import type { ReactNode } from "react";
import { useAuth } from "react-oidc-context";

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

  const userRoles = getUserRoles(auth.user.profile);

  const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function getUserRoles(profile: Record<string, unknown>): string[] {
  const roleClaim = profile.role;

  if (typeof roleClaim === "string") {
    return [roleClaim];
  }

  if (Array.isArray(roleClaim)) {
    return roleClaim.filter((role): role is string => typeof role === "string");
  }

  return [];
}
