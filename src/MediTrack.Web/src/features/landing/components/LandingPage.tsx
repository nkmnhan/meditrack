import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { LandingNav } from "./LandingNav";
import { HeroSection } from "./HeroSection";

// Lazy-load below-fold sections for faster LCP
const ClaraMiniDemo = lazy(() => import("./ClaraMiniDemo").then((m) => ({ default: m.ClaraMiniDemo })));
const FeaturesSection = lazy(() => import("./FeaturesSection").then((m) => ({ default: m.FeaturesSection })));
const HowItWorksSection = lazy(() => import("./HowItWorksSection").then((m) => ({ default: m.HowItWorksSection })));
const ScreenshotShowcase = lazy(() => import("./ScreenshotShowcase").then((m) => ({ default: m.ScreenshotShowcase })));
const TechStackSection = lazy(() => import("./TechStackSection").then((m) => ({ default: m.TechStackSection })));
const TrustSection = lazy(() => import("./TrustSection").then((m) => ({ default: m.TrustSection })));
const WaitlistCapture = lazy(() => import("./WaitlistCapture").then((m) => ({ default: m.WaitlistCapture })));
const FinalCtaSection = lazy(() => import("./FinalCtaSection").then((m) => ({ default: m.FinalCtaSection })));
const StickyLandingCta = lazy(() => import("./StickyLandingCta").then((m) => ({ default: m.StickyLandingCta })));
const LandingFooter = lazy(() => import("./LandingFooter").then((m) => ({ default: m.LandingFooter })));

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
      <HeroSection />
      <Suspense fallback={null}>
        <ClaraMiniDemo />
        <FeaturesSection />
        <HowItWorksSection />
        <ScreenshotShowcase />
        <TechStackSection />
        <TrustSection />
        <WaitlistCapture />
        <FinalCtaSection onSignIn={handleSignIn} />
        <StickyLandingCta />
        <LandingFooter />
      </Suspense>
    </div>
  );
}
