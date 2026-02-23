import { Routes, Route } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ProtectedRoute, CallbackPage } from "./shared/auth";

function AuthenticatedLayout() {
  const auth = useAuth();
  const userName = auth.user?.profile?.name ?? auth.user?.profile?.email ?? "User";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary-700">MediTrack</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userName}</span>
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => auth.signoutRedirect()}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome to MediTrack
          </h2>
          <p className="mt-2 text-gray-500">
            Healthcare Management Platform
          </p>
        </div>
      </main>
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
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
