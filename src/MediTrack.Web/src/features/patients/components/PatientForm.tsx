import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Plus, X } from "lucide-react";
import {
  useGetPatientByIdQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
} from "../store/patientApi";
import type { CreatePatientRequest, UpdatePatientRequest } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

// --- Constants ---

const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-()]{10,20}$/;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-Binary", label: "Non-Binary" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

// --- Validation Schemas ---

const addressSchema = z.object({
  street: z.string().min(1, "Street is required").max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(50),
  zipCode: z.string().min(1, "ZIP code is required").max(20),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  relationship: z.string().min(1, "Relationship is required").max(50),
  phoneNumber: z
    .string()
    .min(1, "Phone is required")
    .regex(PHONE_PATTERN, "Invalid phone format"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
});

const insuranceSchema = z.object({
  provider: z.string().min(1, "Provider is required").max(200),
  policyNumber: z.string().min(1, "Policy number is required").max(100),
  groupNumber: z.string().min(1, "Group number is required").max(100),
  planName: z.string().max(200).or(z.literal("")).optional(),
  effectiveDate: z.string().or(z.literal("")).optional(),
  expirationDate: z.string().or(z.literal("")).optional(),
});

const patientFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name cannot exceed 100 characters")
    .regex(NAME_PATTERN, "Only letters, spaces, hyphens, and apostrophes allowed"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name cannot exceed 100 characters")
    .regex(NAME_PATTERN, "Only letters, spaces, hyphens, and apostrophes allowed"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      (value) => {
        const [year, month, day] = value.split("-").map(Number);
        const dob = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneDayMs = 24 * 60 * 60 * 1000;
        return dob.getTime() <= today.getTime() - oneDayMs;
      },
      "Patient must be at least 1 day old",
    ),
  gender: z.string().min(1, "Gender is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address").max(256),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(PHONE_PATTERN, "Invalid phone number format"),
  address: addressSchema,
  emergencyContact: emergencyContactSchema.optional(),
  insurance: insuranceSchema.optional(),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

// --- Sub-components ---

interface FormFieldProps {
  readonly label: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}

function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-error-600"> *</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
}

// --- Main Component ---

export function PatientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [hasEmergencyContact, setHasEmergencyContact] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);

  const { data: patient, isLoading: isLoadingPatient } = useGetPatientByIdQuery(id!, {
    skip: !isEditMode,
  });

  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();
  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    shouldUnregister: true,
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      phoneNumber: "",
      address: { street: "", street2: "", city: "", state: "", zipCode: "" },
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (patient && isEditMode) {
      const addressData =
        typeof patient.address === "string"
          ? { street: patient.address, city: "", state: "", zipCode: "" }
          : {
              street: patient.address.street,
              street2: patient.address.street2 || "",
              city: patient.address.city,
              state: patient.address.state,
              zipCode: patient.address.zipCode,
            };

      const formData: PatientFormData = {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        email: patient.email,
        phoneNumber: patient.phoneNumber,
        address: addressData,
      };

      if (patient.emergencyContact && typeof patient.emergencyContact !== "string") {
        formData.emergencyContact = {
          name: patient.emergencyContact.name,
          relationship: patient.emergencyContact.relationship,
          phoneNumber: patient.emergencyContact.phoneNumber,
          email: patient.emergencyContact.email || "",
        };
        setHasEmergencyContact(true);
      }

      if (patient.insurance && typeof patient.insurance !== "string") {
        formData.insurance = {
          provider: patient.insurance.provider,
          policyNumber: patient.insurance.policyNumber,
          groupNumber: patient.insurance.groupNumber,
          planName: patient.insurance.planName || "",
          effectiveDate: patient.insurance.effectiveDate || "",
          expirationDate: patient.insurance.expirationDate || "",
        };
        setHasInsurance(true);
      }

      reset(formData);
    }
  }, [patient, reset, isEditMode]);

  const onSubmit = async (formData: PatientFormData) => {
    try {
      const request = {
        ...formData,
        address: { ...formData.address, country: "USA" },
        emergencyContact: hasEmergencyContact ? formData.emergencyContact : undefined,
        insurance: hasInsurance ? formData.insurance : undefined,
      };

      if (isEditMode) {
        await updatePatient({
          id: id!,
          data: request as UpdatePatientRequest,
        }).unwrap();
        navigate(`/patients/${id}`);
      } else {
        const result = await createPatient(request as CreatePatientRequest).unwrap();
        navigate(`/patients/${result.id}`);
      }
    } catch {
      alert(`Failed to ${isEditMode ? "update" : "create"} patient. Please try again.`);
    }
  };

  if (isEditMode && isLoadingPatient) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  const inputClassName =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500";

  // BR-P004: patient must be at least 1 day old
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const maxDateOfBirth = yesterday.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={isEditMode ? `/patients/${id}` : "/patients"}
          className="rounded-lg border border-neutral-300 p-2 text-neutral-700 hover:bg-neutral-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            {isEditMode ? "Edit Patient" : "New Patient"}
          </h1>
          <p className="mt-1 text-neutral-500">
            {isEditMode ? "Update patient information" : "Add a new patient to the system"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="First Name" error={errors.firstName?.message} required>
              <input
                type="text"
                {...register("firstName")}
                className={inputClassName}
                placeholder="John"
                autoComplete="given-name"
              />
            </FormField>

            <FormField label="Last Name" error={errors.lastName?.message} required>
              <input
                type="text"
                {...register("lastName")}
                className={inputClassName}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </FormField>

            <FormField label="Date of Birth" error={errors.dateOfBirth?.message} required>
              <input
                type="date"
                {...register("dateOfBirth")}
                className={inputClassName}
                max={maxDateOfBirth}
                autoComplete="bday"
              />
            </FormField>

            <FormField label="Gender" error={errors.gender?.message} required>
              <select {...register("gender")} className={inputClassName}>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Contact Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Email" error={errors.email?.message} required>
              <input
                type="email"
                {...register("email")}
                className={inputClassName}
                placeholder="john.doe@example.com"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Phone Number" error={errors.phoneNumber?.message} required>
              <input
                type="tel"
                {...register("phoneNumber")}
                className={inputClassName}
                placeholder="+1 (555) 123-4567"
                autoComplete="tel"
              />
            </FormField>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Address</h2>
          <div className="space-y-4">
            <FormField label="Street" error={errors.address?.street?.message} required>
              <input
                type="text"
                {...register("address.street")}
                className={inputClassName}
                placeholder="123 Main St"
                autoComplete="address-line1"
              />
            </FormField>

            <FormField label="Street 2" error={errors.address?.street2?.message}>
              <input
                type="text"
                {...register("address.street2")}
                className={inputClassName}
                placeholder="Apt, Suite, Unit (optional)"
                autoComplete="address-line2"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="City" error={errors.address?.city?.message} required>
                <input
                  type="text"
                  {...register("address.city")}
                  className={inputClassName}
                  placeholder="New York"
                  autoComplete="address-level2"
                />
              </FormField>

              <FormField label="State" error={errors.address?.state?.message} required>
                <input
                  type="text"
                  {...register("address.state")}
                  className={inputClassName}
                  placeholder="NY"
                  autoComplete="address-level1"
                />
              </FormField>

              <FormField label="ZIP Code" error={errors.address?.zipCode?.message} required>
                <input
                  type="text"
                  {...register("address.zipCode")}
                  className={inputClassName}
                  placeholder="10001"
                  autoComplete="postal-code"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Emergency Contact (optional, toggle) */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Emergency Contact</h2>
            <button
              type="button"
              onClick={() => setHasEmergencyContact(!hasEmergencyContact)}
              className={clsxMerge(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium",
                hasEmergencyContact
                  ? "text-error-700 hover:bg-error-50"
                  : "text-primary-700 hover:bg-primary-50",
              )}
            >
              {hasEmergencyContact ? (
                <>
                  <X className="h-4 w-4" />
                  Remove
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </button>
          </div>

          {hasEmergencyContact && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Name"
                error={errors.emergencyContact?.name?.message}
                required
              >
                <input
                  type="text"
                  {...register("emergencyContact.name")}
                  className={inputClassName}
                  placeholder="Jane Doe"
                />
              </FormField>

              <FormField
                label="Relationship"
                error={errors.emergencyContact?.relationship?.message}
                required
              >
                <input
                  type="text"
                  {...register("emergencyContact.relationship")}
                  className={inputClassName}
                  placeholder="Spouse"
                />
              </FormField>

              <FormField
                label="Phone"
                error={errors.emergencyContact?.phoneNumber?.message}
                required
              >
                <input
                  type="tel"
                  {...register("emergencyContact.phoneNumber")}
                  className={inputClassName}
                  placeholder="+1 (555) 987-6543"
                />
              </FormField>

              <FormField label="Email" error={errors.emergencyContact?.email?.message}>
                <input
                  type="email"
                  {...register("emergencyContact.email")}
                  className={inputClassName}
                  placeholder="jane.doe@example.com"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Insurance (optional, toggle) */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Insurance Information</h2>
            <button
              type="button"
              onClick={() => setHasInsurance(!hasInsurance)}
              className={clsxMerge(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium",
                hasInsurance
                  ? "text-error-700 hover:bg-error-50"
                  : "text-primary-700 hover:bg-primary-50",
              )}
            >
              {hasInsurance ? (
                <>
                  <X className="h-4 w-4" />
                  Remove
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </button>
          </div>

          {hasInsurance && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Provider"
                error={errors.insurance?.provider?.message}
                required
              >
                <input
                  type="text"
                  {...register("insurance.provider")}
                  className={inputClassName}
                  placeholder="Blue Cross Blue Shield"
                />
              </FormField>

              <FormField
                label="Policy Number"
                error={errors.insurance?.policyNumber?.message}
                required
              >
                <input
                  type="text"
                  {...register("insurance.policyNumber")}
                  className={inputClassName}
                  placeholder="POL-12345678"
                />
              </FormField>

              <FormField
                label="Group Number"
                error={errors.insurance?.groupNumber?.message}
                required
              >
                <input
                  type="text"
                  {...register("insurance.groupNumber")}
                  className={inputClassName}
                  placeholder="GRP-001"
                />
              </FormField>

              <FormField label="Plan Name" error={errors.insurance?.planName?.message}>
                <input
                  type="text"
                  {...register("insurance.planName")}
                  className={inputClassName}
                  placeholder="PPO Gold (optional)"
                />
              </FormField>

              <FormField
                label="Effective Date"
                error={errors.insurance?.effectiveDate?.message}
              >
                <input
                  type="date"
                  {...register("insurance.effectiveDate")}
                  className={inputClassName}
                />
              </FormField>

              <FormField
                label="Expiration Date"
                error={errors.insurance?.expirationDate?.message}
              >
                <input
                  type="date"
                  {...register("insurance.expirationDate")}
                  className={inputClassName}
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to={isEditMode ? `/patients/${id}` : "/patients"}
            className="rounded-lg border border-neutral-300 px-6 py-2 text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isDirty || isCreating || isUpdating}
            className={clsxMerge(
              "inline-flex items-center gap-2 rounded-lg px-6 py-2 text-white",
              "bg-primary-700 hover:bg-primary-800",
              "disabled:cursor-not-allowed disabled:bg-neutral-300",
            )}
          >
            {isCreating || isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditMode ? "Update Patient" : "Create Patient"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
