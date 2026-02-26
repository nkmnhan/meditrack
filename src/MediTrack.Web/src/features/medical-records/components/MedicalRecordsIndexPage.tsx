import { Link } from "react-router-dom";
import { FileText, Users } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

export function MedicalRecordsIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Medical Records</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Browse and manage patient medical records
        </p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-neutral-200 bg-white p-6">
        <FileText className="h-12 w-12 text-neutral-400" />
        <h2 className="mt-4 text-lg font-semibold text-neutral-900">Select a Patient</h2>
        <p className="mt-2 text-sm text-neutral-600 text-center max-w-md">
          Medical records are organized by patient. Browse the patient directory to access their records.
        </p>
        <Link
          to="/patients"
          className={clsxMerge(
            "mt-6 inline-flex items-center gap-2",
            "h-10 px-4 rounded-lg",
            "bg-primary-700 text-white",
            "hover:bg-primary-800",
            "transition-colors duration-200"
          )}
        >
          <Users className="h-4 w-4" />
          Browse Patients
        </Link>
      </div>
    </div>
  );
}
