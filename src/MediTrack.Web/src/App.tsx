import { Routes, Route, Link } from "react-router-dom";
import { ProtectedRoute, CallbackPage, RoleGuard, UserRole } from "./shared/auth";
import { Layout } from "./shared/components";
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
} from "./features/emergen-ai";
import { Users, Calendar, FileText, ArrowRight, Brain } from "lucide-react";
import { clsxMerge } from "./shared/utils/clsxMerge";

function Dashboard() {
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
        <DashboardCard
          to="/emergen-ai"
          icon={<Brain className="h-8 w-8" />}
          title="Emergen AI"
          description="AI-powered medical secretary"
          color="primary"
        />
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
        path="/emergen-ai"
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
        path="/emergen-ai/session/:sessionId"
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
