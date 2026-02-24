import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { clsxMerge } from "../utils/clsxMerge";

interface LayoutProps {
  readonly children: ReactNode;
}

interface NavLinkProps {
  readonly to: string;
  readonly icon: React.ElementType;
  readonly label: string;
  readonly disabled?: boolean;
}

function NavLink({ to, icon: Icon, label, disabled }: NavLinkProps) {
  const location = useLocation();
  const isActive = to === "/"
    ? location.pathname === "/"
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  if (disabled) {
    return (
      <div
        className={clsxMerge(
          "flex items-center gap-3 rounded-lg px-3 py-2",
          "cursor-not-allowed opacity-50",
          "text-neutral-400"
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto text-xs">(Soon)</span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={clsxMerge(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        isActive
          ? "bg-primary-700 text-white"
          : "text-neutral-700 hover:bg-neutral-100"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
    </Link>
  );
}

export function Layout({ children }: LayoutProps) {
  const auth = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userName = auth.user?.profile?.name ?? auth.user?.profile?.email ?? "User";
  const userRole = (auth.user?.profile?.role as string | undefined) ?? "User";

  const handleSignOut = () => {
    auth.signoutRedirect();
  };

  const navigation = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", disabled: false },
    { to: "/patients", icon: Users, label: "Patients", disabled: false },
    { to: "/appointments", icon: Calendar, label: "Appointments", disabled: true },
    { to: "/medical-records", icon: FileText, label: "Medical Records", disabled: true },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50 lg:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-neutral-200 px-6">
          <h1 className="text-xl font-bold text-primary-700">MediTrack</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-neutral-200 p-4">
          <div className="mb-3 rounded-lg bg-neutral-50 p-3">
            <p className="text-sm font-medium text-neutral-900">{userName}</p>
            <p className="text-xs text-neutral-500">{userRole}</p>
          </div>
          <button
            onClick={handleSignOut}
            className={clsxMerge(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2",
              "text-error-700 hover:bg-error-50"
            )}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col lg:hidden">
        <header className="flex h-16 items-center border-b border-neutral-200 bg-white px-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="ml-3 text-xl font-bold text-primary-700">MediTrack</h1>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="border-b border-neutral-200 bg-white p-4">
            <div className="space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <div className="mb-3 rounded-lg bg-neutral-50 p-3">
                <p className="text-sm font-medium text-neutral-900">{userName}</p>
                <p className="text-xs text-neutral-500">{userRole}</p>
              </div>
              <button
                onClick={handleSignOut}
                className={clsxMerge(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2",
                  "text-error-700 hover:bg-error-50"
                )}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
