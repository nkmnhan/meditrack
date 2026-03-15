import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, CallbackPage, RoleGuard, UserRole } from "./shared/auth";
import { Layout, NotFound, PageSkeleton } from "./shared/components";
import { DemoProvider, DemoBanner } from "./shared/demo";

/* ── Lazy-loaded page components ── */
/* Import directly from component files (not barrel index.ts) for better tree-shaking */

const LandingPage = lazy(() =>
  import("./features/landing/components/LandingPage").then(module => ({ default: module.LandingPage }))
);
const DashboardPage = lazy(() =>
  import("./features/dashboard/components/DashboardPage").then(module => ({ default: module.DashboardPage }))
);
const PatientList = lazy(() =>
  import("./features/patients/components/PatientList").then(module => ({ default: module.PatientList }))
);
const PatientDetail = lazy(() =>
  import("./features/patients/components/PatientDetail").then(module => ({ default: module.PatientDetail }))
);
const PatientForm = lazy(() =>
  import("./features/patients/components/PatientForm").then(module => ({ default: module.PatientForm }))
);
const AppointmentCalendarPage = lazy(() =>
  import("./features/appointments/components/AppointmentCalendarPage").then(module => ({ default: module.AppointmentCalendarPage }))
);
const AppointmentDetailPage = lazy(() =>
  import("./features/appointments/components/AppointmentDetailPage").then(module => ({ default: module.AppointmentDetailPage }))
);
const AdminDashboardPage = lazy(() =>
  import("./features/admin/components/AdminDashboardPage").then(module => ({ default: module.AdminDashboardPage }))
);
const AdminReportsPage = lazy(() =>
  import("./features/admin/components/AdminReportsPage").then(module => ({ default: module.AdminReportsPage }))
);
const AdminUsersPage = lazy(() =>
  import("./features/admin/components/AdminUsersPage").then(module => ({ default: module.AdminUsersPage }))
);
const AdminSystemPage = lazy(() =>
  import("./features/admin/components/AdminSystemPage").then(module => ({ default: module.AdminSystemPage }))
);
const AdminAuditPage = lazy(() =>
  import("./features/admin/components/AdminAuditPage").then(module => ({ default: module.AdminAuditPage }))
);
const AdminFhirViewerPage = lazy(() =>
  import("./features/admin/components/AdminFhirViewerPage").then(module => ({ default: module.AdminFhirViewerPage }))
);
const AdminImportWizardPage = lazy(() =>
  import("./features/admin/components/AdminImportWizardPage").then(module => ({ default: module.AdminImportWizardPage }))
);
const AdminIntegrationsPage = lazy(() =>
  import("./features/admin/components/AdminIntegrationsPage").then(module => ({ default: module.AdminIntegrationsPage }))
);
const MedicalRecordDetailPage = lazy(() =>
  import("./features/medical-records/components/MedicalRecordDetailPage").then(module => ({ default: module.MedicalRecordDetailPage }))
);
const MedicalRecordsIndexPage = lazy(() =>
  import("./features/medical-records/components/MedicalRecordsIndexPage").then(module => ({ default: module.MedicalRecordsIndexPage }))
);
const PatientMedicalRecordsPage = lazy(() =>
  import("./features/medical-records/components/PatientMedicalRecordsPage").then(module => ({ default: module.PatientMedicalRecordsPage }))
);
const SessionStartScreen = lazy(() =>
  import("./features/clara/components/SessionStartScreen").then(module => ({ default: module.SessionStartScreen }))
);
const LiveSessionView = lazy(() =>
  import("./features/clara/components/LiveSessionView").then(module => ({ default: module.LiveSessionView }))
);
const SessionSummary = lazy(() =>
  import("./features/clara/components/SessionSummary").then(module => ({ default: module.SessionSummary }))
);
const DevPanel = lazy(() =>
  import("./features/clara/components/DevPanel").then(module => ({ default: module.DevPanel }))
);

interface DemoLayoutProps {
  readonly children: ReactNode;
}

function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <DemoProvider>
      <Layout>
        <DemoBanner />
        {children}
      </Layout>
    </DemoProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <LandingPage />
          </Suspense>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <DashboardPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <PatientList />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/new"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <PatientForm />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <PatientDetail />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <PatientForm />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <AppointmentCalendarPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <AppointmentDetailPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <MedicalRecordsIndexPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <MedicalRecordDetailPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:patientId/medical-records"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <PatientMedicalRecordsPage />
              </Suspense>
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
                <Suspense fallback={<PageSkeleton />}>
                  <SessionStartScreen />
                  <DevPanel />
                </Suspense>
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
                <Suspense fallback={<PageSkeleton />}>
                  <LiveSessionView />
                  <DevPanel />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clara/session/:sessionId/summary"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Doctor, UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <SessionSummary />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminDashboardPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminReportsPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminUsersPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/system"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminSystemPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminAuditPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/fhir-viewer"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminFhirViewerPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/import"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminImportWizardPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/integrations"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Admin]}>
              <Layout>
                <Suspense fallback={<PageSkeleton />}>
                  <AdminIntegrationsPage />
                </Suspense>
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      {/* ── Demo routes (no auth required) ── */}
      <Route
        path="/demo/dashboard"
        element={
          <DemoLayout>
            <Suspense fallback={<PageSkeleton />}>
              <DashboardPage />
            </Suspense>
          </DemoLayout>
        }
      />
      <Route
        path="/demo/patients"
        element={
          <DemoLayout>
            <Suspense fallback={<PageSkeleton />}>
              <PatientList />
            </Suspense>
          </DemoLayout>
        }
      />
      <Route
        path="/demo/clara"
        element={
          <DemoLayout>
            <Suspense fallback={<PageSkeleton />}>
              <SessionStartScreen />
            </Suspense>
          </DemoLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
