import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, CallbackPage, RoleGuard, UserRole } from "./shared/auth";
import { Layout, NotFound } from "./shared/components";
import { DashboardPage } from "./features/dashboard";
import { PatientList, PatientDetail, PatientForm } from "./features/patients";
import { AppointmentCalendarPage, AppointmentDetailPage } from "./features/appointments";
import {
  AdminReportsPage,
  AdminUsersPage,
  AdminSystemPage,
  AdminAuditPage,
} from "./features/admin";
import {
  MedicalRecordDetailPage,
  MedicalRecordsIndexPage,
  PatientMedicalRecordsPage,
} from "./features/medical-records";
import {
  SessionStartScreen,
  LiveSessionView,
  SessionSummary,
  DevPanel,
} from "./features/clara";

export default function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
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
        path="/appointments/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <AppointmentDetailPage />
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
      <Route
        path="/clara/session/:sessionId/summary"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Doctor, UserRole.Admin]}>
              <Layout>
                <SessionSummary />
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
                <AdminReportsPage />
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
                <AdminUsersPage />
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
                <AdminSystemPage />
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
                <AdminAuditPage />
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
