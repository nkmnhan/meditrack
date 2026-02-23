import { useEffect, useRef, type ReactNode } from "react";
import { AuthProvider as OidcAuthProvider, useAuth } from "react-oidc-context";
import type { User } from "oidc-client-ts";
import { oidcConfig } from "./authConfig";
import { configureAxiosAuth } from "./axiosInstance";

interface AuthProviderProps {
  readonly children: ReactNode;
}

function AxiosAuthConfigurator({ children }: { readonly children: ReactNode }) {
  const auth = useAuth();
  const userRef = useRef<User | null | undefined>(auth.user);
  const onUnauthorizedRef = useRef<() => void>(() => {
    void auth.signinRedirect();
  });
  const configuredRef = useRef(false);

  // Keep refs in sync with latest values on every render
  userRef.current = auth.user;
  onUnauthorizedRef.current = () => {
    void auth.signinRedirect();
  };

  useEffect(() => {
    if (configuredRef.current) {
      return;
    }

    configureAxiosAuth({
      getUser: () => userRef.current,
      onUnauthorized: () => onUnauthorizedRef.current?.(),
    });

    configuredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable, intentionally run once
  }, []);

  return <>{children}</>;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <OidcAuthProvider {...oidcConfig}>
      <AxiosAuthConfigurator>{children}</AxiosAuthConfigurator>
    </OidcAuthProvider>
  );
}
