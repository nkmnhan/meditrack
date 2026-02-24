import { useCallback, useMemo } from "react";
import { useAuth } from "react-oidc-context";
import type { UserRoleType } from "./roles";

function extractRoles(profile: Record<string, unknown>): string[] {
  const roleClaim = profile.role;

  if (typeof roleClaim === "string") {
    return [roleClaim];
  }

  if (Array.isArray(roleClaim)) {
    return roleClaim.filter((role): role is string => typeof role === "string");
  }

  return [];
}

export function useRoles() {
  const auth = useAuth();

  const roles = useMemo(
    () => (auth.user?.profile ? extractRoles(auth.user.profile) : []),
    [auth.user?.profile],
  );

  const hasRole = useCallback(
    (role: UserRoleType): boolean => roles.includes(role),
    [roles],
  );

  const hasAnyRole = useCallback(
    (allowedRoles: UserRoleType[]): boolean =>
      allowedRoles.some((role) => roles.includes(role)),
    [roles],
  );

  const hasAllRoles = useCallback(
    (requiredRoles: UserRoleType[]): boolean =>
      requiredRoles.every((role) => roles.includes(role)),
    [roles],
  );

  return {
    roles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAuthenticated: auth.isAuthenticated,
  };
}
