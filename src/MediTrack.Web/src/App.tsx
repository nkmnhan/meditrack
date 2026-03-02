import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, CallbackPage, RoleGuard, UserRole } from "./shared/auth";
import { Layout, NotFound, PageSkeleton } from "./shared/components";

/* ── Lazy-loaded page components ── */
/* Import directly from component files (not barrel index.ts) for better tree-shaking */

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

export default function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
