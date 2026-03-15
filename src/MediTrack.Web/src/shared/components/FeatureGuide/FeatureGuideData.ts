import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Sparkles, ShieldCheck } from "lucide-react";

interface FeatureGuideStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly navigateTo: string;
}

const FEATURE_GUIDE_STEPS: readonly FeatureGuideStep[] = [
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "Get a bird's-eye view of your day — appointments, pending records, and AI-powered insights all in one place.",
    icon: LayoutDashboard,
    iconBg: "bg-primary-50",
    iconColor: "text-primary-700",
    navigateTo: "/dashboard",
  },
  {
    id: "patients",
    title: "Patient Management",
    description: "Search, filter, and manage your patient roster. Access full medical histories, vitals, and care plans with a single click.",
    icon: Users,
    iconBg: "bg-secondary-50",
    iconColor: "text-secondary-700",
    navigateTo: "/patients",
  },
  {
    id: "clara",
    title: "Clara AI Assistant",
    description: "Your clinical companion — get real-time suggestions during sessions, check drug interactions, and review differentials instantly.",
    icon: Sparkles,
    iconBg: "bg-accent-50",
    iconColor: "text-accent-700",
    navigateTo: "/clara",
  },
  {
    id: "admin",
    title: "Admin & Reports",
    description: "Monitor system health, manage users, review audit logs, and track clinical analytics from the admin panel.",
    icon: ShieldCheck,
    iconBg: "bg-warning-50",
    iconColor: "text-warning-700",
    navigateTo: "/admin/reports",
  },
];

export { FEATURE_GUIDE_STEPS };
export type { FeatureGuideStep };
