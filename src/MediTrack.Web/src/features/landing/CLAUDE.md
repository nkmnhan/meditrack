# Landing Feature — Public Marketing Page

## Overview
Unauthenticated public page. Composed of independently lazy-loaded section components. No API calls except the waitlist form (which is currently a UI stub — no backend).

## Section Components
| Component | Purpose |
|-----------|---------|
| `LandingPage.tsx` | Root composition — renders sections in order |
| `LandingNav.tsx` | Top navbar with sign-in link |
| `HeroSection.tsx` | Headline + CTA button |
| `FeaturesSection.tsx` | Feature card grid |
| `HowItWorksSection.tsx` | Numbered steps explainer |
| `ClaraMiniDemo.tsx` | Inline AI demo widget |
| `TrustSection.tsx` | HIPAA / compliance trust badges |
| `TechStackSection.tsx` | Tech logos grid |
| `ScreenshotShowcase.tsx` | Product screenshot carousel |
| `StickyLandingCta.tsx` | Sticky bottom bar CTA |
| `FinalCtaSection.tsx` | Pre-footer conversion section |
| `LandingFooter.tsx` | Footer links |
| `WaitlistCapture.tsx` | Email waitlist form — **UI stub only**, no backend. Captures email in state and shows success message. TODO: wire to email collection API |

## Route: `/` (public, no auth)
