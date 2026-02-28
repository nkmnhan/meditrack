import { Routes, Route, Link } from "react-router-dom";
import { ProtectedRoute, CallbackPage, RoleGuard, UserRole } from "./shared/auth";
import { Layout, useClaraPanel } from "./shared/components";
import { PatientList, PatientDetail, PatientForm } from "./features/patients";
import { AppointmentCalendarPage } from "./features/appointments";
import {
  MedicalRecordDetailPage,
  MedicalRecordsIndexPage,
  PatientMedicalRecordsPage,
} from "./features/medical-records";
import {
  SessionStartScreen,
  LiveSessionView,
  DevPanel,
} from "./features/clara";
import { claraSuggestions } from "./features/clara/data/clara-suggestions";
import { Users, Calendar, FileText, ArrowRight, Sparkles } from "lucide-react";
import { clsxMerge } from "./shared/utils/clsxMerge";

function Dashboard() {
  const { openPanel } = useClaraPanel();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-neutral-900">Welcome to MediTrack</h2>
        <p className="mt-2 text-lg text-neutral-600">Healthcare Management Platform</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          to="/patients"
          icon={<Users className="h-8 w-8" />}
          title="Patients"
          description="Manage patient records and information"
          color="primary"
        />
        <DashboardCard
          to="/appointments"
          icon={<Calendar className="h-8 w-8" />}
          title="Appointments"
          description="Schedule and manage appointments"
          color="secondary"
        />
        <DashboardCard
          to="/medical-records"
          icon={<FileText className="h-8 w-8" />}
          title="Medical Records"
          description="View and manage medical records"
          color="accent"
        />
        {/* Ask Clara — opens panel instead of navigating */}
        <button
          onClick={() => openPanel()}
          className={clsxMerge(
            "group text-left",
            "block rounded-lg border border-neutral-200 bg-white p-6 shadow-sm",
            "transition-all duration-200",
            "hover:border-accent-300 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div
              className={clsxMerge(
                "rounded-lg p-3",
                "transition-colors duration-200",
                "bg-accent-50 text-accent-700 group-hover:bg-accent-100"
              )}
            >
              <Sparkles className="h-8 w-8" />
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent-700" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">Ask Clara</h3>
          <p className="mt-2 text-sm text-neutral-600">AI-powered medical secretary</p>
        </button>
      </div>

      {/* Clara's Suggestions — clickable cards that open panel with prefilled prompt */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Clara&apos;s Suggestions</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {claraSuggestions.map((suggestion) => {
            const SuggestionIcon = suggestion.icon;
            return (
              <button
                key={suggestion.id}
                onClick={() => openPanel(suggestion.prompt)}
                className={clsxMerge(
                  "group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left",
                  "transition-all duration-200",
                  "hover:border-accent-300 hover:shadow-sm"
                )}
              >
                <div
                  className={clsxMerge(
                    "w-1 self-stretch rounded-full flex-shrink-0",
                    suggestion.accentColor
                  )}
                />
                <div
                  className={clsxMerge(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                    "bg-neutral-50 text-neutral-600 group-hover:bg-accent-50 group-hover:text-accent-700",
                    "transition-colors"
                  )}
                >
                  <SuggestionIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{suggestion.label}</p>
                  <p className="text-xs text-neutral-500">{suggestion.category}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  readonly to: string;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly color: "primary" | "secondary" | "accent";
}

function DashboardCard({ to, icon, title, description, color }: DashboardCardProps) {
  const colorStyles = {
    primary: "bg-primary-50 text-primary-700 group-hover:bg-primary-100",
    secondary: "bg-secondary-50 text-secondary-700 group-hover:bg-secondary-100",
    accent: "bg-accent-50 text-accent-700 group-hover:bg-accent-100",
  };

  return (
    <Link
      to={to}
      className={clsxMerge(
        "group",
        "block rounded-lg border border-neutral-200 bg-white p-6 shadow-sm",
        "transition-all duration-200",
        "hover:border-primary-300 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={clsxMerge(
            "rounded-lg p-3",
            "transition-colors duration-200",
            colorStyles[color]
          )}
        >
          {icon}
        </div>
        <ArrowRight className="h-5 w-5 text-neutral-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary-700" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </Link>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/new"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <Layout>
              <AppointmentCalendarPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <Layout>
              <MedicalRecordsIndexPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <MedicalRecordDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:patientId/medical-records"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientMedicalRecordsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clara"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Doctor, UserRole.Admin]}>
              <Layout>
                <SessionStartScreen />
                <DevPanel />
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clara/session/:sessionId"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Doctor, UserRole.Admin]}>
              <Layout>
                <LiveSessionView />
                <DevPanel />
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
