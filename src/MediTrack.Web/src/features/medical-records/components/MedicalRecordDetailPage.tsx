import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
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
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-lg font-semibold text-neutral-700">Record Not Found</p>
        <Link to="/medical-records" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Medical Records
        </Link>
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
