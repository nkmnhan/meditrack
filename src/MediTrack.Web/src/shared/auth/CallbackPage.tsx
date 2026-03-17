import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-error-600">Sign-in failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{auth.error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-lg text-muted-foreground">Completing sign-in...</p>
    </div>
  );
}
