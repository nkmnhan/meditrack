import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Sparkles,
  Menu,
  LogOut,
  BarChart3,
  UserCog,
  Activity,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { clsxMerge } from "../utils/clsxMerge";
import { useRoles } from "../auth/useRoles";
import { UserRole } from "../auth/roles";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { ClaraPanelProvider } from "./clara/ClaraPanelContext";
import { ClaraFab } from "./clara/ClaraFab";
import { ClaraPanel } from "./clara/ClaraPanel";

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
  const isActive = to === "/"
    ? location.pathname === "/"
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={clsxMerge(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary-50 text-primary-700 font-semibold"
          : "text-neutral-700 hover:bg-neutral-50"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
    </Link>
  );
}

const clinicalNavItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/medical-records", icon: FileText, label: "Medical Records" },
];

const adminNavItems: NavItem[] = [
  { to: "/admin/reports", icon: BarChart3, label: "Reports" },
  { to: "/admin/users", icon: UserCog, label: "User Management" },
  { to: "/admin/system", icon: Activity, label: "System Health" },
  { to: "/admin/audit", icon: ShieldCheck, label: "Audit Log" },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <ClaraPanelProvider>
      <div className="min-h-screen bg-neutral-50">
        {/* Sidebar — Desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-neutral-200 bg-white md:flex md:flex-col">
          <SidebarContent />
        </aside>

        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-white px-4 shadow-sm md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-50"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary-700" />
            <span className="text-lg font-bold text-primary-700">MediTrack</span>
          </Link>
          <div className="w-9" aria-hidden="true" />
        </header>

        {/* Mobile Menu — Sheet drawer */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent onNavigate={closeMobileMenu} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="min-h-screen md:ml-64">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>

        {/* Clara AI — Floating button + slide-in panel */}
        <ClaraFab />
        <ClaraPanel />
      </div>
    </ClaraPanelProvider>
  );
}
