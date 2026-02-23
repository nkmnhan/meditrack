import { Routes, Route } from "react-router-dom";

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-700">MediTrack</h1>
        <p className="mt-2 text-lg text-gray-500">
          Healthcare Management Platform
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
