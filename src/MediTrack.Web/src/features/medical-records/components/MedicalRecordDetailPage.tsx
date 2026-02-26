import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useGetMedicalRecordByIdQuery } from "../store/medicalRecordsApi";
import { MedicalRecordDetail } from "../components/MedicalRecordDetail";

export function MedicalRecordDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: record, isLoading, error } = useGetMedicalRecordByIdQuery(id!);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-700 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading medical record...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-600 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-neutral-900">Record Not Found</h2>
          <p className="mt-2 text-neutral-600">
            The medical record you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return <MedicalRecordDetail record={record} />;
}
