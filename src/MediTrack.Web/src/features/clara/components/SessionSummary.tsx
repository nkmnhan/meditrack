import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Stethoscope,
  User,
  Clock,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { useGetSessionQuery } from "../store/claraApi";
import { useCreateMedicalRecordMutation } from "@/features/medical-records/store/medicalRecordsApi";
import { DiagnosisSeverity } from "@/features/medical-records/types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* ── Types ── */

interface PrescriptionDraft {
  readonly medicationName: string;
  readonly dosage: string;
  readonly frequency: string;
  readonly durationDays: string;
  readonly instructions: string;
}

const EMPTY_PRESCRIPTION: PrescriptionDraft = {
  medicationName: "",
  dosage: "",
  frequency: "",
  durationDays: "",
  instructions: "",
};

const SEVERITY_OPTIONS = [
  { value: DiagnosisSeverity.Mild, label: "Mild" },
  { value: DiagnosisSeverity.Moderate, label: "Moderate" },
  { value: DiagnosisSeverity.Severe, label: "Severe" },
  { value: DiagnosisSeverity.Critical, label: "Critical" },
];

/* ── Component ── */

export function SessionSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useGetSessionQuery(sessionId!);
  const [createMedicalRecord, { isLoading: isCreating }] = useCreateMedicalRecordMutation();

  // Form state
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [diagnosisDescription, setDiagnosisDescription] = useState("");
  const [severity, setSeverity] = useState<DiagnosisSeverity>(DiagnosisSeverity.Moderate);
  const [soapNote, setSoapNote] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionDraft[]>([]);
  const [followUp, setFollowUp] = useState("");

  const handleAddPrescription = () => {
    setPrescriptions([...prescriptions, { ...EMPTY_PRESCRIPTION }]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, prescriptionIndex) => prescriptionIndex !== index));
  };

  const handlePrescriptionChange = (
    index: number,
    field: keyof PrescriptionDraft,
    value: string,
  ) => {
    setPrescriptions(
      prescriptions.map((prescription, prescriptionIndex) =>
        prescriptionIndex === index ? { ...prescription, [field]: value } : prescription,
      ),
    );
  };

  const handleSave = async () => {
    if (!session?.patientId) {
      toast.error("No patient linked to this session. Cannot create medical record.");
      return;
    }
    if (!chiefComplaint.trim() || !diagnosisCode.trim() || !diagnosisDescription.trim()) {
      toast.error("Please fill in the chief complaint, diagnosis code, and description.");
      return;
    }

    try {
      const result = await createMedicalRecord({
        patientId: session.patientId,
        chiefComplaint: chiefComplaint.trim(),
        diagnosisCode: diagnosisCode.trim(),
        diagnosisDescription: diagnosisDescription.trim(),
        severity,
        recordedByDoctorId: session.doctorId,
        recordedByDoctorName: "Current Doctor",
      }).unwrap();
      toast.success("Medical record saved successfully.");
      navigate(`/medical-records/${result.id}`);
    } catch {
      toast.error("Failed to save medical record. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-lg font-semibold text-neutral-700">Session not found</p>
        <Link to="/clara" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Clara
        </Link>
      </div>
    );
  }

  const patientStatements = session.transcriptLines.filter(
    (line) => line.speaker === "Patient",
  );

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Clara", href: "/clara" },
          { label: `Session ${sessionId?.slice(0, 8) ?? ""}`, href: `/clara/session/${sessionId}` },
          { label: "Summary" },
        ]}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Session Summary</h1>
            <p className="text-sm text-neutral-500 font-mono">
              {sessionId?.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column — Session data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session stats */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-neutral-200 pb-3">
              <Clock className="h-5 w-5 text-primary-700" />
              <h3 className="text-sm font-semibold text-neutral-900">Session Stats</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">
                  {session.transcriptLines.length}
                </p>
                <p className="text-xs text-neutral-500">Transcript Lines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{session.suggestions.length}</p>
                <p className="text-xs text-neutral-500">Suggestions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{patientStatements.length}</p>
                <p className="text-xs text-neutral-500">Patient Statements</p>
              </div>
            </div>
          </div>

          {/* Patient statements */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-neutral-200 pb-3">
              <User className="h-5 w-5 text-primary-700" />
              <h3 className="text-sm font-semibold text-neutral-900">Patient Statements</h3>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {patientStatements.length === 0 ? (
                <p className="text-sm text-neutral-500">No patient statements recorded.</p>
              ) : (
                patientStatements.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg bg-secondary-50 p-3 text-sm text-neutral-700"
                  >
                    <p>{line.text}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(line.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-neutral-200 pb-3">
              <Sparkles className="h-5 w-5 text-accent-500" />
              <h3 className="text-sm font-semibold text-neutral-900">Clara&apos;s Suggestions</h3>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {session.suggestions.length === 0 ? (
                <p className="text-sm text-neutral-500">No suggestions were generated.</p>
              ) : (
                session.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="rounded-lg border border-accent-100 bg-accent-50 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                        {suggestion.type}
                      </span>
                      {suggestion.urgency === "high" && (
                        <span className="inline-flex items-center rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-700">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-700">{suggestion.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column — Medical record draft form */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-6 lg:sticky lg:top-4">
            <div className="flex items-center gap-2 mb-6 border-b border-neutral-200 pb-3">
              <FileText className="h-5 w-5 text-primary-700" />
              <h3 className="text-sm font-semibold text-neutral-900">Medical Record Draft</h3>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">
                <Sparkles className="h-3 w-3" />
                AI-Assisted
              </span>
            </div>

            <div className="space-y-5">
              {/* Chief Complaint */}
              <div>
                <label
                  htmlFor="chiefComplaint"
                  className="mb-1.5 block text-sm font-medium text-neutral-700"
                >
                  Chief Complaint <span className="text-error-500">*</span>
                </label>
                <input
                  id="chiefComplaint"
                  type="text"
                  value={chiefComplaint}
                  onChange={(event) => setChiefComplaint(event.target.value)}
                  placeholder="e.g. Persistent headache for 3 days"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                />
              </div>

              {/* Diagnosis Code + Description */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="diagnosisCode"
                    className="mb-1.5 block text-sm font-medium text-neutral-700"
                  >
                    ICD-10 Code <span className="text-error-500">*</span>
                  </label>
                  <input
                    id="diagnosisCode"
                    type="text"
                    value={diagnosisCode}
                    onChange={(event) => setDiagnosisCode(event.target.value)}
                    placeholder="e.g. R51.9"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="diagnosisDescription"
                    className="mb-1.5 block text-sm font-medium text-neutral-700"
                  >
                    Description <span className="text-error-500">*</span>
                  </label>
                  <input
                    id="diagnosisDescription"
                    type="text"
                    value={diagnosisDescription}
                    onChange={(event) => setDiagnosisDescription(event.target.value)}
                    placeholder="e.g. Headache, unspecified"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  />
                </div>
              </div>

              {/* Severity */}
              <div>
                <label
                  htmlFor="severity"
                  className="mb-1.5 block text-sm font-medium text-neutral-700"
                >
                  Severity
                </label>
                <div className="relative">
                  <select
                    id="severity"
                    value={severity}
                    onChange={(event) =>
                      setSeverity(event.target.value as DiagnosisSeverity)
                    }
                    className="h-10 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  >
                    {SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Stethoscope className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              {/* SOAP Note */}
              <div>
                <label
                  htmlFor="soapNote"
                  className="mb-1.5 block text-sm font-medium text-neutral-700"
                >
                  SOAP Note
                </label>
                <textarea
                  id="soapNote"
                  value={soapNote}
                  onChange={(event) => setSoapNote(event.target.value)}
                  rows={6}
                  placeholder={
                    "S: (Subjective)\n\nO: (Objective)\n\nA: (Assessment)\n\nP: (Plan)"
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                />
              </div>

              {/* Prescriptions */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-700">Prescriptions</label>
                  <button
                    type="button"
                    onClick={handleAddPrescription}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                {prescriptions.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No prescriptions added. Click &ldquo;Add&rdquo; to create one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((prescription, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-500">
                            Prescription #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePrescription(index)}
                            className="rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-error-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            value={prescription.medicationName}
                            onChange={(event) =>
                              handlePrescriptionChange(index, "medicationName", event.target.value)
                            }
                            placeholder="Medication name"
                            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                          />
                          <input
                            type="text"
                            value={prescription.dosage}
                            onChange={(event) =>
                              handlePrescriptionChange(index, "dosage", event.target.value)
                            }
                            placeholder="Dosage (e.g. 500mg)"
                            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                          />
                          <input
                            type="text"
                            value={prescription.frequency}
                            onChange={(event) =>
                              handlePrescriptionChange(index, "frequency", event.target.value)
                            }
                            placeholder="Frequency (e.g. twice daily)"
                            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                          />
                          <input
                            type="text"
                            value={prescription.durationDays}
                            onChange={(event) =>
                              handlePrescriptionChange(index, "durationDays", event.target.value)
                            }
                            placeholder="Duration (days)"
                            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                          />
                        </div>
                        <input
                          type="text"
                          value={prescription.instructions}
                          onChange={(event) =>
                            handlePrescriptionChange(index, "instructions", event.target.value)
                          }
                          placeholder="Instructions (optional)"
                          className="mt-3 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Follow-up */}
              <div>
                <label
                  htmlFor="followUp"
                  className="mb-1.5 block text-sm font-medium text-neutral-700"
                >
                  Follow-up
                </label>
                <input
                  id="followUp"
                  type="text"
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  placeholder="e.g. Follow-up in 2 weeks if symptoms persist"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/clara")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Discard Draft
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isCreating || !chiefComplaint.trim() || !diagnosisCode.trim()}
                className={clsxMerge(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                  "bg-primary-700 text-sm font-medium text-white",
                  "hover:bg-primary-600 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save as Medical Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
