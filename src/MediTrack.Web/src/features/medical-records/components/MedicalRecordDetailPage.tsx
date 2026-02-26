import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useGetMedicalRecordByIdQuery } from "../store/medicalRecordsApi";
import { MedicalRecordDetail } from "../components/MedicalRecordDetail";
import { Breadcrumb } from "@/shared/components";
import { useGetPatientByIdQuery } from "@/features/patients/store/patientApi";

export function MedicalRecordDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: record, isLoading, error } = useGetMedicalRecordByIdQuery(id!);
  const { data: patient } = useGetPatientByIdQuery(record?.patientId ?? "", {
    skip: !record?.patientId,
  });

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

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          to={`/patients/${record.patientId}/medical-records`}
          className="rounded-lg border border-neutral-300 p-2 text-neutral-700 hover:bg-neutral-50 md:hidden"
          aria-label="Back to medical records"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <Breadcrumb
            items={[
              { label: "Patients", href: "/patients" },
              { label: patientName, href: `/patients/${record.patientId}` },
              { label: "Medical Records", href: `/patients/${record.patientId}/medical-records` },
              { label: record.chiefComplaint },
            ]}
          />
        </div>
      </div>
      <MedicalRecordDetail record={record} />
    </div>
  );
}
