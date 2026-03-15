import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Sparkles,
  LogOut,
  BarChart3,
  UserCog,
  Activity,
  ShieldCheck,
  Stethoscope,
  Code2,
  FileUp,
  Cable,
  MoreHorizontal,
} from "lucide-react";
import { clsxMerge } from "../utils/clsxMerge";
import { useRoles } from "../auth/useRoles";
import { UserRole } from "../auth/roles";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { ClaraPanelProvider } from "./clara/ClaraPanelContext";
import { ClaraFab } from "./clara/ClaraFab";
import { ClaraPanel } from "./clara/ClaraPanel";
import { FeatureGuideButton } from "./FeatureGuide";
import { CommandPalette } from "./CommandPalette";

interface LayoutProps {
  readonly children: ReactNode;
}

interface NavItem {
  readonly to: string;
  readonly icon: React.ElementType;
  readonly label: string;
}

function NavLink({ to, icon: Icon, label, onNavigate }: NavItem & { readonly onNavigate?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={clsxMerge(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-healing-100 text-healing-500 font-semibold"
          : "text-neutral-700 hover:bg-healing-50"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
    </Link>
  );
}

const mobileBottomNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: CalendarDays, label: "Appts" },
  { to: "/medical-records", icon: FileText, label: "Records" },
];

function MoreMenuContent({ onClose }: { readonly onClose: () => void }) {
  const auth = useAuth();
  const { hasAnyRole, hasRole } = useRoles();
  const isDoctorOrAdmin = hasAnyRole([UserRole.Doctor, UserRole.Admin]);
  const isAdmin = hasRole(UserRole.Admin);

  const userName = auth.user?.profile?.name ?? auth.user?.profile?.email ?? "User";
  const userRole = (auth.user?.profile?.role as string | undefined) ?? "User";
  const userInitials = String(userName)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col">
      {/* Clara AI */}
      {isDoctorOrAdmin && (
        <Link
          to="/clara"
          onClick={onClose}
          className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors active:bg-neutral-50"
        >
          <Sparkles className="h-5 w-5 text-accent-500" />
          <span>Clara AI</span>
        </Link>
      )}

      {/* Admin section */}
      {isAdmin && (
        <>
          <div className="mx-6 my-1 border-t border-neutral-200" />
          <p className="px-6 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Admin</p>
          {adminNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors active:bg-neutral-50"
            >
              <item.icon className="h-5 w-5 text-neutral-500" />
              <span>{item.label}</span>
            </Link>
          ))}
        </>
      )}

      {/* User profile + sign out */}
      <div className="mx-6 mt-1 border-t border-neutral-200" />
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
          {userInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{userName}</p>
          <p className="text-xs text-neutral-500">{userRole}</p>
        </div>
        <button
          onClick={() => auth.signoutRedirect()}
          className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MobileBottomNav() {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur-sm md:hidden">
        <div className="flex items-stretch">
          {mobileBottomNavItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsxMerge(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative",
                  isActive
                    ? "text-healing-500"
                    : "text-neutral-500 active:text-neutral-700"
                )}
              >
                <item.icon className={clsxMerge("h-5 w-5", isActive && "text-healing-500")} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-10 rounded-full bg-healing-400" />
                )}
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={clsxMerge(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isMoreOpen ? "text-healing-500" : "text-neutral-500 active:text-neutral-700"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More menu Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8">
          <SheetTitle className="sr-only">More Options</SheetTitle>
          <MoreMenuContent onClose={() => setIsMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

const clinicalNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/medical-records", icon: FileText, label: "Medical Records" },
];

const adminNavItems: NavItem[] = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/reports", icon: BarChart3, label: "Reports" },
  { to: "/admin/users", icon: UserCog, label: "User Management" },
  { to: "/admin/system", icon: Activity, label: "System Health" },
  { to: "/admin/audit", icon: ShieldCheck, label: "Audit Log" },
  { to: "/admin/fhir-viewer", icon: Code2, label: "FHIR Viewer" },
  { to: "/admin/import", icon: FileUp, label: "Data Import" },
  { to: "/admin/integrations", icon: Cable, label: "Integrations" },
];

function SidebarContent({ onNavigate }: { readonly onNavigate?: () => void }) {
  const auth = useAuth();
  const { hasRole, hasAnyRole } = useRoles();

  const userName = auth.user?.profile?.name ?? auth.user?.profile?.email ?? "User";
  const userRole = (auth.user?.profile?.role as string | undefined) ?? "User";
  const isDoctorOrAdmin = hasAnyRole([UserRole.Doctor, UserRole.Admin]);
  const isAdmin = hasRole(UserRole.Admin);

  const userInitials = String(userName)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
    auth.signoutRedirect();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6">
        <Stethoscope className="h-7 w-7 text-primary-700" />
        <span className="text-xl font-bold text-primary-700">MediTrack</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {clinicalNavItems.map((item) => (
          <NavLink key={item.to} {...item} onNavigate={onNavigate} />
        ))}

        {isDoctorOrAdmin && (
          <NavLink
            to="/clara"
            icon={Sparkles}
            label="Clara AI"
            onNavigate={onNavigate}
          />
        )}

        {isAdmin && (
          <div className="mx-0 my-2 border-t border-neutral-200 pt-2">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <NavLink key={item.to} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900">{userName}</p>
            <p className="text-xs text-neutral-500">{userRole}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <ClaraPanelProvider>
      <div className="min-h-screen bg-gradient-to-b from-healing-50 to-healing-100/30">
        {/* Sidebar — Desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-neutral-200 bg-gradient-to-b from-white to-healing-50 md:flex md:flex-col">
          <SidebarContent />
        </aside>

        {/* Mobile Header — logo only */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-center bg-white/95 backdrop-blur-sm shadow-sm md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary-700" />
            <span className="text-base font-bold text-primary-700">MediTrack</span>
          </Link>
        </header>

        {/* Main Content */}
        <main className="min-h-screen md:ml-64">
          <div className="animate-page-in p-4 pb-28 md:p-6 md:pb-6 lg:p-8 lg:pb-8">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Clara AI — Floating button + slide-in panel */}
        <ClaraFab />
        <FeatureGuideButton />
        <ClaraPanel />
        <CommandPalette />
      </div>
    </ClaraPanelProvider>
  );
}
