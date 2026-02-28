import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center px-4">
        <div className="flex justify-center mb-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
            <FileQuestion className="h-10 w-10 text-primary-700" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-neutral-900">404</h1>
        <p className="mt-3 text-xl font-semibold text-neutral-700">Page not found</p>
        <p className="mt-2 text-neutral-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
