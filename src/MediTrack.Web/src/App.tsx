import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, CallbackPage } from "./shared/auth";
import { Layout } from "./shared/components";
import { PatientList, PatientDetail, PatientForm } from "./features/patients";

function Dashboard() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-neutral-900">Welcome to MediTrack</h2>
      <p className="mt-2 text-neutral-500">Healthcare Management Platform</p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900">Patients</h3>
          <p className="mt-2 text-sm text-neutral-500">Manage patient records and information</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm opacity-50">
          <h3 className="text-lg font-semibold text-neutral-900">Appointments</h3>
          <p className="mt-2 text-sm text-neutral-500">Coming soon</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm opacity-50">
          <h3 className="text-lg font-semibold text-neutral-900">Medical Records</h3>
          <p className="mt-2 text-sm text-neutral-500">Coming soon</p>
        </div>
      </div>
    </div>
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
    </Routes>
  );
}
