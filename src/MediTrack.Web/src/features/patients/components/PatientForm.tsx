import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, User, Phone, AlertCircle, Shield, ChevronDown } from "lucide-react";
import {
  useGetPatientByIdQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
} from "../store/patientApi";
import type { CreatePatientRequest, UpdatePatientRequest } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

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

const INPUT_CLASSES = "h-10 w-full rounded-md border px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-white";
const INPUT_NORMAL = `${INPUT_CLASSES} border-neutral-200 focus:ring-primary-700`;
const INPUT_ERROR = `${INPUT_CLASSES} border-error-500 focus:ring-error-500`;

function FormLabel({
  htmlFor,
  children,
  isRequired,
}: {
  readonly htmlFor: string;
  readonly children: React.ReactNode;
  readonly isRequired?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-neutral-700">
      {children}
      {isRequired && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  iconColor,
  note,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly iconColor?: string;
  readonly note?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <Icon className={clsxMerge("h-5 w-5", iconColor || "text-primary-700")} />
      <h3 className="font-semibold text-neutral-900">{title}</h3>
      {note && <span className="ml-1 text-xs text-neutral-500">({note})</span>}
    </div>
  );
}

function SelectWrapper({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
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
      toast.error(`Failed to ${isEditMode ? "update" : "create"} patient. Please try again.`);
    }
  };

  if (isEditMode && isLoadingPatient) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  // BR-P004: patient must be at least 1 day old
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const maxDateOfBirth = yesterday.toISOString().split("T")[0];

  const breadcrumbItems = isEditMode
    ? [
        { label: "Home", href: "/" },
        { label: "Patients", href: "/patients" },
        { label: patient ? `${patient.firstName} ${patient.lastName}` : "...", href: `/patients/${id}` },
        { label: "Edit" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Patients", href: "/patients" },
        { label: "New Patient" },
      ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          {isEditMode ? "Edit Patient" : "Register New Patient"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isEditMode ? "Update the patient's information below" : "Fill in the patient's information below"}
        </p>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white shadow-sm">

          {/* Section 1 — Personal Information */}
          <div className="border-b border-neutral-200 p-6">
            <SectionHeader icon={User} title="Personal Information" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="firstName" isRequired>First Name</FormLabel>
                <input
                  id="firstName"
                  type="text"
                  {...register("firstName")}
                  placeholder="Enter first name"
                  autoComplete="given-name"
                  className={errors.firstName ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-error-500">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="lastName" isRequired>Last Name</FormLabel>
                <input
                  id="lastName"
                  type="text"
                  {...register("lastName")}
                  placeholder="Enter last name"
                  autoComplete="family-name"
                  className={errors.lastName ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-error-500">{errors.lastName.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="dateOfBirth" isRequired>Date of Birth</FormLabel>
                <input
                  id="dateOfBirth"
                  type="date"
                  {...register("dateOfBirth")}
                  max={maxDateOfBirth}
                  autoComplete="bday"
                  className={errors.dateOfBirth ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-xs text-error-500">{errors.dateOfBirth.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="gender" isRequired>Gender</FormLabel>
                <SelectWrapper>
                  <select
                    id="gender"
                    {...register("gender")}
                    className={clsxMerge(
                      "h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-white",
                      errors.gender
                        ? "border-error-500 text-neutral-900 focus:ring-error-500"
                        : "border-neutral-200 text-neutral-900 focus:ring-primary-700"
                    )}
                  >
                    <option value="" disabled>Select gender</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </SelectWrapper>
                {errors.gender && (
                  <p className="mt-1 text-xs text-error-500">{errors.gender.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 — Contact Information */}
          <div className="border-b border-neutral-200 p-6">
            <SectionHeader icon={Phone} title="Contact Information" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="phoneNumber" isRequired>Phone Number</FormLabel>
                <input
                  id="phoneNumber"
                  type="tel"
                  {...register("phoneNumber")}
                  placeholder="(555) 000-0000"
                  autoComplete="tel"
                  className={errors.phoneNumber ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-xs text-error-500">{errors.phoneNumber.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="email" isRequired>Email Address</FormLabel>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="patient@example.com"
                  autoComplete="email"
                  className={errors.email ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-error-500">{errors.email.message}</p>
                )}
              </div>

              {/* Street Address — full width */}
              <div className="md:col-span-2">
                <FormLabel htmlFor="address.street" isRequired>Street Address</FormLabel>
                <input
                  id="address.street"
                  type="text"
                  {...register("address.street")}
                  placeholder="Enter street address"
                  autoComplete="address-line1"
                  className={errors.address?.street ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.address?.street && (
                  <p className="mt-1 text-xs text-error-500">{errors.address.street.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <FormLabel htmlFor="address.street2">Street Address 2</FormLabel>
                <input
                  id="address.street2"
                  type="text"
                  {...register("address.street2")}
                  placeholder="Apt, Suite, Unit (optional)"
                  autoComplete="address-line2"
                  className={INPUT_NORMAL}
                />
              </div>
              <div>
                <FormLabel htmlFor="address.city" isRequired>City</FormLabel>
                <input
                  id="address.city"
                  type="text"
                  {...register("address.city")}
                  placeholder="Enter city"
                  autoComplete="address-level2"
                  className={errors.address?.city ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.address?.city && (
                  <p className="mt-1 text-xs text-error-500">{errors.address.city.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="address.state" isRequired>State</FormLabel>
                <input
                  id="address.state"
                  type="text"
                  {...register("address.state")}
                  placeholder="NY"
                  autoComplete="address-level1"
                  className={errors.address?.state ? INPUT_ERROR : INPUT_NORMAL}
                />
                {errors.address?.state && (
                  <p className="mt-1 text-xs text-error-500">{errors.address.state.message}</p>
                )}
              </div>
              <div>
                <FormLabel htmlFor="address.zipCode" isRequired>ZIP Code</FormLabel>
                <input
                  id="address.zipCode"
                  type="text"
                  {...register("address.zipCode")}
                  placeholder="00000"
                  autoComplete="postal-code"
                  className={clsxMerge(
                    errors.address?.zipCode ? INPUT_ERROR : INPUT_NORMAL,
                    "max-w-[120px]"
                  )}
                />
                {errors.address?.zipCode && (
                  <p className="mt-1 text-xs text-error-500">{errors.address.zipCode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3 — Emergency Contact */}
          <div className={clsxMerge(
            "border-b border-neutral-200 p-6",
            hasEmergencyContact && "border-l-4 border-l-warning-500"
          )}>
            <SectionHeader
              icon={AlertCircle}
              title="Emergency Contact"
              iconColor="text-warning-500"
              note={hasEmergencyContact ? undefined : "Optional"}
            />
            {!hasEmergencyContact ? (
              <button
                type="button"
                onClick={() => setHasEmergencyContact(true)}
                className="text-sm font-medium text-primary-700 hover:underline"
              >
                + Add Emergency Contact
              </button>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FormLabel htmlFor="emergencyContact.name" isRequired>Contact Name</FormLabel>
                    <input
                      id="emergencyContact.name"
                      type="text"
                      {...register("emergencyContact.name")}
                      placeholder="Full name"
                      className={errors.emergencyContact?.name ? INPUT_ERROR : INPUT_NORMAL}
                    />
                    {errors.emergencyContact?.name && (
                      <p className="mt-1 text-xs text-error-500">{errors.emergencyContact.name.message}</p>
                    )}
                  </div>
                  <div>
                    <FormLabel htmlFor="emergencyContact.relationship" isRequired>Relationship</FormLabel>
                    <input
                      id="emergencyContact.relationship"
                      type="text"
                      {...register("emergencyContact.relationship")}
                      placeholder="Spouse, Parent, etc."
                      className={errors.emergencyContact?.relationship ? INPUT_ERROR : INPUT_NORMAL}
                    />
                    {errors.emergencyContact?.relationship && (
                      <p className="mt-1 text-xs text-error-500">{errors.emergencyContact.relationship.message}</p>
                    )}
                  </div>
                  <div>
                    <FormLabel htmlFor="emergencyContact.phoneNumber" isRequired>Contact Phone</FormLabel>
                    <input
                      id="emergencyContact.phoneNumber"
                      type="tel"
                      {...register("emergencyContact.phoneNumber")}
                      placeholder="(555) 000-0000"
                      className={errors.emergencyContact?.phoneNumber ? INPUT_ERROR : INPUT_NORMAL}
                    />
                    {errors.emergencyContact?.phoneNumber && (
                      <p className="mt-1 text-xs text-error-500">{errors.emergencyContact.phoneNumber.message}</p>
                    )}
                  </div>
                  <div>
                    <FormLabel htmlFor="emergencyContact.email">Contact Email</FormLabel>
                    <input
                      id="emergencyContact.email"
                      type="email"
                      {...register("emergencyContact.email")}
                      placeholder="email@example.com (optional)"
                      className={errors.emergencyContact?.email ? INPUT_ERROR : INPUT_NORMAL}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasEmergencyContact(false)}
                  className="mt-3 text-sm font-medium text-error-700 hover:underline"
                >
                  Remove Emergency Contact
                </button>
              </>
            )}
          </div>

          {/* Section 4 — Insurance Information */}
          <div className="p-6">
            <SectionHeader
              icon={Shield}
              title="Insurance Information"
              note={hasInsurance ? undefined : "Optional \u2014 can be added later"}
            />
            {!hasInsurance ? (
              <button
                type="button"
                onClick={() => setHasInsurance(true)}
                className="text-sm font-medium text-primary-700 hover:underline"
              >
                + Add Insurance
              </button>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FormLabel htmlFor="insurance.provider" isRequired>Insurance Provider</FormLabel>
                    <input
                      id="insurance.provider"
                      type="text"
                      {...register("insurance.provider")}
                      placeholder="e.g. Blue Cross Blue Shield"
                      className={errors.insurance?.provider ? INPUT_ERROR : INPUT_NORMAL}
                    />
                    {errors.insurance?.provider && (
                      <p className="mt-1 text-xs text-error-500">{errors.insurance.provider.message}</p>
                    )}
                  </div>
                  <div>
                    <FormLabel htmlFor="insurance.policyNumber" isRequired>Policy Number</FormLabel>
                    <input
                      id="insurance.policyNumber"
                      type="text"
                      {...register("insurance.policyNumber")}
                      placeholder="Enter policy number"
                      className={errors.insurance?.policyNumber ? INPUT_ERROR : INPUT_NORMAL}
                    />
                    {errors.insurance?.policyNumber && (
                      <p className="mt-1 text-xs text-error-500">{errors.insurance.policyNumber.message}</p>
                    )}
                  </div>
                  <div>
                    <FormLabel htmlFor="insurance.groupNumber" isRequired>Group Number</FormLabel>
                    <input
                      id="insurance.groupNumber"
                      type="text"
                      {...register("insurance.groupNumber")}
                      placeholder="Enter group number"
                      className={errors.insurance?.groupNumber ? INPUT_ERROR : INPUT_NORMAL}
                    />
                    {errors.insurance?.groupNumber && (
                      <p className="mt-1 text-xs text-error-500">{errors.insurance.groupNumber.message}</p>
                    )}
                  </div>
                  <div>
                    <FormLabel htmlFor="insurance.planName">Plan Name</FormLabel>
                    <input
                      id="insurance.planName"
                      type="text"
                      {...register("insurance.planName")}
                      placeholder="PPO Gold (optional)"
                      className={INPUT_NORMAL}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasInsurance(false)}
                  className="mt-3 text-sm font-medium text-error-700 hover:underline"
                >
                  Remove Insurance
                </button>
              </>
            )}
          </div>

          {/* Form Footer */}
          <div className="flex flex-col-reverse gap-3 rounded-b-lg border-t border-neutral-200 bg-neutral-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={isEditMode ? `/patients/${id}` : "/patients"}
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isDirty || isCreating || isUpdating}
              className={clsxMerge(
                "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6",
                "bg-primary-700 text-sm font-medium text-white",
                "transition-colors hover:bg-primary-600",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {isEditMode ? "Update Patient" : "Register Patient"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
