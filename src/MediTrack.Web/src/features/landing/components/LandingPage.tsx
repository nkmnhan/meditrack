import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { LandingNav } from "./LandingNav";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { ScreenshotShowcase } from "./ScreenshotShowcase";
import { TechStackSection } from "./TechStackSection";
import { TrustSection } from "./TrustSection";
import { LandingFooter } from "./LandingFooter";

export function LandingPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-lg text-neutral-500">Loading...</p>
      </div>
    );
  }

  const handleSignIn = () => {
    auth.signinRedirect();
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNav onSignIn={handleSignIn} />
      <HeroSection onSignIn={handleSignIn} />
      <FeaturesSection />
      <HowItWorksSection />
      <ScreenshotShowcase />
      <TechStackSection />
      <TrustSection />
      <LandingFooter />
    </div>
  );
}
