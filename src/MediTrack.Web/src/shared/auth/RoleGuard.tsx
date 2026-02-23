import type { ReactNode } from "react";
import type { UserRoleType } from "./roles";
import { useRoles } from "./useRoles";

interface RoleGuardProps {
  readonly allowedRoles: UserRoleType[];
  readonly children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isAuthenticated, hasAnyRole } = useRoles();

  if (!isAuthenticated) {
    return null;
  }

  if (!hasAnyRole(allowedRoles)) {
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
