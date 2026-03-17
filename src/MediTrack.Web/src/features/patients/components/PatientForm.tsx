import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Loader2, UserPlus, User, Phone, AlertCircle, AlertTriangle, Shield,
  ChevronDown, Calendar, Plus, X, Stethoscope, Languages, FileCheck,
  Camera, Check, Info, ChevronsUpDown, Mail, MessageSquare, PhoneCall, Mailbox,
} from "lucide-react";
import {
  useGetPatientByIdQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
} from "../store/patientApi";
import type { CreatePatientRequest, UpdatePatientRequest } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/shared/components/ui/command";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";

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

const BLOOD_TYPE_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
] as const;

const RELATIONSHIP_OPTIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"] as const;

const ALLERGY_SEVERITY_OPTIONS = [
  { value: "Mild", label: "Mild" },
  { value: "Moderate", label: "Moderate" },
  { value: "Severe", label: "Severe" },
  { value: "Life-threatening", label: "Life-threatening" },
] as const;

interface AllergyEntry {
  readonly name: string;
  readonly severity: string;
}

const SEVERITY_CHIP_STYLES: Record<string, string> = {
  Mild: "bg-success-50 text-success-700",
  Moderate: "bg-warning-50 text-warning-700",
  Severe: "bg-error-50 text-error-700",
  "Life-threatening": "bg-error-100 text-error-900 border border-error-500",
};

const PROVIDER_OPTIONS = [
  { name: "Dr. Nguyen", specialty: "Family Medicine" },
  { name: "Dr. Patel", specialty: "Internal Medicine" },
  { name: "Dr. Kim", specialty: "Pediatrics" },
  { name: "Dr. Smith", specialty: "General Practice" },
  { name: "Dr. Lee", specialty: "Geriatrics" },
] as const;

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "Mandarin", "Vietnamese", "Korean", "Arabic", "French", "Other",
] as const;

const COMMUNICATION_OPTIONS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "phone", label: "Phone", icon: PhoneCall },
  { value: "mail", label: "Mail", icon: Mailbox },
] as const;

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
  bloodType: z.string().optional(),
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

const INPUT_CLASSES = "h-10 w-full rounded-md border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-card";
const INPUT_NORMAL = clsxMerge(INPUT_CLASSES, "border-border focus:ring-primary-700");
const INPUT_ERROR = clsxMerge(INPUT_CLASSES, "border-error-500 focus:ring-error-500");

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
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground/80">
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
      <h3 className="font-semibold text-foreground">{title}</h3>
      {note && <span className="ml-1 text-xs text-muted-foreground">({note})</span>}
    </div>
  );
}

function SelectWrapper({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
  const [hasAllergies, setHasAllergies] = useState(false);
  const [allergies, setAllergies] = useState<AllergyEntry[]>([]);
  const [allergyInputValue, setAllergyInputValue] = useState("");

  // P1: Primary Care Provider
  const [selectedProvider, setSelectedProvider] = useState("");
  const [isProviderPopoverOpen, setIsProviderPopoverOpen] = useState(false);

  // P2: Language & Communication
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [isInterpreterNeeded, setIsInterpreterNeeded] = useState(false);
  const [communicationPreference, setCommunicationPreference] = useState("");

  // P2: Consent
  const [hasHipaaConsent, setHasHipaaConsent] = useState(false);
  const [hipaaSignedDate, setHipaaSignedDate] = useState("");
  const [hasAiConsent, setHasAiConsent] = useState(false);

  // P3: Photo Upload
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
      bloodType: "",
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
        bloodType: patient.bloodType || "",
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

      if (patient.allergies) {
        const parsedAllergies = patient.allergies.split(",").map((entry) => {
          const trimmed = entry.trim();
          const severityMatch = trimmed.match(/\(([^)]+)\)$/);
          if (severityMatch) {
            return {
              name: trimmed.replace(severityMatch[0], "").trim(),
              severity: severityMatch[1],
            };
          }
          return { name: trimmed, severity: "Moderate" };
        }).filter((allergy) => allergy.name.length > 0);

        if (parsedAllergies.length > 0) {
          setAllergies(parsedAllergies);
          setHasAllergies(true);
        }
      }

      reset(formData);
    }
  }, [patient, reset, isEditMode]);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      toast.error("Image must be less than 5MB.");
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    setPhotoFile(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  // Intentionally only run cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (formData: PatientFormData) => {
    try {
      const allergiesString = hasAllergies && allergies.length > 0
        ? allergies.map((allergy) => `${allergy.name} (${allergy.severity})`).join(", ")
        : undefined;

      const request = {
        ...formData,
        address: { ...formData.address, country: "USA" },
        bloodType: formData.bloodType || undefined,
        allergies: allergiesString,
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
        { label: "Home", href: "/dashboard" },
        { label: "Patients", href: "/patients" },
        { label: patient ? `${patient.firstName} ${patient.lastName}` : "...", href: `/patients/${id}` },
        { label: "Edit" },
      ]
    : [
        { label: "Home", href: "/dashboard" },
        { label: "Patients", href: "/patients" },
        { label: "New Patient" },
      ];

  const selectedProviderData = PROVIDER_OPTIONS.find(
    (provider) => provider.name === selectedProvider
  );

  // Track whether form has extra state changes beyond react-hook-form
  const hasExtraChanges = allergies.length > 0 || selectedProvider !== "" ||
    preferredLanguage !== "" || isInterpreterNeeded || communicationPreference !== "" ||
    hasHipaaConsent || hasAiConsent || photoFile !== null;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isEditMode ? "Edit Patient" : "Register New Patient"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEditMode ? "Update the patient's information below" : "Fill in the patient's information below"}
        </p>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card shadow-sm">

          {/* Section 1 — Personal Information */}
          <div className="border-b border-border p-6">
            <SectionHeader icon={User} title="Personal Information" />

            {/* Photo upload + Name fields row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Photo Upload (P3) */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className={clsxMerge(
                    "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    "border-2 border-dashed border-border bg-muted",
                    "transition-colors hover:border-primary-700 hover:bg-primary-50",
                    "focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2",
                  )}
                  aria-label="Upload patient photo"
                >
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Patient photo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground/70" />
                  )}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  aria-label="Patient photo file input"
                />
                {photoPreviewUrl ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-medium text-error-700 hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Photo</span>
                )}
              </div>

              {/* Name fields */}
              <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
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
              </div>
            </div>

            {/* Remaining personal info fields */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="dateOfBirth" isRequired>Date of Birth</FormLabel>
                <div className="relative">
                  <input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                    max={maxDateOfBirth}
                    autoComplete="bday"
                    className={errors.dateOfBirth ? INPUT_ERROR : INPUT_NORMAL}
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
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
                      "h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-card",
                      errors.gender
                        ? "border-error-500 text-foreground focus:ring-error-500"
                        : "border-border text-foreground focus:ring-primary-700"
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
              <div>
                <FormLabel htmlFor="bloodType">Blood Type</FormLabel>
                <SelectWrapper>
                  <select
                    id="bloodType"
                    {...register("bloodType")}
                    className={clsxMerge(
                      "h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-card",
                      "border-border text-foreground focus:ring-primary-700"
                    )}
                  >
                    <option value="">Select blood type</option>
                    {BLOOD_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
            </div>
          </div>

          {/* Section 2 — Contact Information */}
          <div className="border-b border-border p-6">
            <SectionHeader icon={Phone} title="Contact Information" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="phoneNumber" isRequired>Phone Number</FormLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+1</span>
                  <input
                    id="phoneNumber"
                    type="tel"
                    {...register("phoneNumber")}
                    placeholder="(555) 000-0000"
                    autoComplete="tel"
                    className={clsxMerge(
                      errors.phoneNumber ? INPUT_ERROR : INPUT_NORMAL,
                      "pl-9"
                    )}
                  />
                </div>
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
                <SelectWrapper>
                  <select
                    id="address.state"
                    {...register("address.state")}
                    autoComplete="address-level1"
                    className={clsxMerge(
                      "h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-card",
                      errors.address?.state
                        ? "border-error-500 text-foreground focus:ring-error-500"
                        : "border-border text-foreground focus:ring-primary-700"
                    )}
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((stateCode) => (
                      <option key={stateCode} value={stateCode}>{stateCode}</option>
                    ))}
                  </select>
                </SelectWrapper>
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
            "border-b border-border p-6",
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
                    <SelectWrapper>
                      <select
                        id="emergencyContact.relationship"
                        {...register("emergencyContact.relationship")}
                        className={clsxMerge(
                          "h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-card",
                          errors.emergencyContact?.relationship
                            ? "border-error-500 text-foreground focus:ring-error-500"
                            : "border-border text-foreground focus:ring-primary-700"
                        )}
                      >
                        <option value="" disabled>Select relationship</option>
                        {RELATIONSHIP_OPTIONS.map((relationship) => (
                          <option key={relationship} value={relationship}>{relationship}</option>
                        ))}
                      </select>
                    </SelectWrapper>
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
          <div className="border-b border-border p-6">
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

          {/* Section 5 — Allergies & Adverse Reactions */}
          <div className={clsxMerge(
            "border-b border-border p-6",
            hasAllergies && "border-l-4 border-l-error-500"
          )}>
            <SectionHeader
              icon={AlertTriangle}
              title="Allergies & Adverse Reactions"
              iconColor="text-error-500"
              note={hasAllergies ? undefined : "Optional"}
            />
            {!hasAllergies ? (
              <button
                type="button"
                onClick={() => setHasAllergies(true)}
                className="text-sm font-medium text-primary-700 hover:underline"
              >
                + Add Allergies
              </button>
            ) : (
              <>
                {/* Allergy input */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <FormLabel htmlFor="allergyInput">Allergy Name</FormLabel>
                    <input
                      id="allergyInput"
                      type="text"
                      value={allergyInputValue}
                      onChange={(event) => setAllergyInputValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const trimmedName = allergyInputValue.trim();
                          if (trimmedName.length === 0) return;
                          const isDuplicate = allergies.some(
                            (allergy) => allergy.name.toLowerCase() === trimmedName.toLowerCase()
                          );
                          if (isDuplicate) return;
                          setAllergies((previous) => [...previous, { name: trimmedName, severity: "Moderate" }]);
                          setAllergyInputValue("");
                        }
                      }}
                      placeholder="Type allergy name and press Enter..."
                      className={INPUT_NORMAL}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmedName = allergyInputValue.trim();
                      if (trimmedName.length === 0) return;
                      const isDuplicate = allergies.some(
                        (allergy) => allergy.name.toLowerCase() === trimmedName.toLowerCase()
                      );
                      if (isDuplicate) return;
                      setAllergies((previous) => [...previous, { name: trimmedName, severity: "Moderate" }]);
                      setAllergyInputValue("");
                    }}
                    className={clsxMerge(
                      "inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4",
                      "border border-primary-700 text-sm font-medium text-primary-700",
                      "transition-colors hover:bg-primary-50",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>

                {/* Allergy chips */}
                {allergies.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {allergies.map((allergy, allergyIndex) => (
                      <div
                        key={allergy.name}
                        className={clsxMerge(
                          "inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5",
                          "text-sm font-medium",
                          SEVERITY_CHIP_STYLES[allergy.severity] || SEVERITY_CHIP_STYLES["Moderate"]
                        )}
                      >
                        <span>{allergy.name}</span>
                        <select
                          value={allergy.severity}
                          onChange={(event) => {
                            const updatedSeverity = event.target.value;
                            setAllergies((previous) =>
                              previous.map((entry, entryIndex) =>
                                entryIndex === allergyIndex
                                  ? { ...entry, severity: updatedSeverity }
                                  : entry
                              )
                            );
                          }}
                          className={clsxMerge(
                            "appearance-none rounded border-none bg-transparent py-0 pl-1 pr-0.5 text-xs font-semibold",
                            "cursor-pointer focus:outline-none focus:ring-1 focus:ring-border",
                          )}
                          aria-label={`Severity for ${allergy.name}`}
                        >
                          {ALLERGY_SEVERITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setAllergies((previous) =>
                              previous.filter((_, entryIndex) => entryIndex !== allergyIndex)
                            );
                          }}
                          className={clsxMerge(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full",
                            "transition-colors hover:bg-black/10",
                          )}
                          aria-label={`Remove ${allergy.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setHasAllergies(false);
                    setAllergies([]);
                    setAllergyInputValue("");
                  }}
                  className="mt-3 text-sm font-medium text-error-700 hover:underline"
                >
                  Remove All Allergies
                </button>
              </>
            )}
          </div>

          {/* Section 6 — Primary Care Provider (P1) */}
          <div className="border-b border-border p-6">
            <SectionHeader
              icon={Stethoscope}
              title="Primary Care Provider"
              note="Optional"
            />
            <div className="max-w-sm">
              <FormLabel htmlFor="primaryCareProvider">Assigned Provider</FormLabel>
              <Popover open={isProviderPopoverOpen} onOpenChange={setIsProviderPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    id="primaryCareProvider"
                    role="combobox"
                    aria-expanded={isProviderPopoverOpen}
                    className={clsxMerge(
                      "flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm",
                      "bg-card transition-shadow focus:border-transparent focus:outline-none focus:ring-2",
                      "border-border focus:ring-primary-700",
                    )}
                  >
                    {selectedProvider ? (
                      <span className="text-foreground">{selectedProvider}</span>
                    ) : (
                      <span className="text-muted-foreground/70">Search providers...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search providers..." />
                    <CommandList>
                      <CommandEmpty>No provider found.</CommandEmpty>
                      <CommandGroup>
                        {PROVIDER_OPTIONS.map((provider) => (
                          <CommandItem
                            key={provider.name}
                            value={provider.name}
                            onSelect={(currentValue) => {
                              setSelectedProvider(
                                currentValue === selectedProvider ? "" : currentValue
                              );
                              setIsProviderPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={clsxMerge(
                                "mr-2 h-4 w-4",
                                selectedProvider === provider.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{provider.name}</span>
                              <span className="text-xs text-muted-foreground">{provider.specialty}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected provider chip */}
              {selectedProviderData && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-50 py-1.5 pl-3 pr-1.5 text-sm font-medium text-primary-700">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>{selectedProviderData.name}</span>
                  <span className="text-xs text-primary-500">{selectedProviderData.specialty}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProvider("")}
                    className={clsxMerge(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full",
                      "transition-colors hover:bg-primary-100",
                    )}
                    aria-label={`Remove ${selectedProviderData.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 7 — Language & Communication Preferences (P2) */}
          <div className="border-b border-border p-6">
            <SectionHeader
              icon={Languages}
              title="Language & Communication Preferences"
              note="Optional"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Preferred Language */}
              <div>
                <FormLabel htmlFor="preferredLanguage">Preferred Language</FormLabel>
                <SelectWrapper>
                  <select
                    id="preferredLanguage"
                    value={preferredLanguage}
                    onChange={(event) => setPreferredLanguage(event.target.value)}
                    className={clsxMerge(
                      "h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 bg-card",
                      "border-border text-foreground focus:ring-primary-700"
                    )}
                  >
                    <option value="">Select language</option>
                    {LANGUAGE_OPTIONS.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>

              {/* Interpreter Needed */}
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="interpreterNeeded"
                    checked={isInterpreterNeeded}
                    onCheckedChange={(checked) => setIsInterpreterNeeded(checked === true)}
                  />
                  <Label htmlFor="interpreterNeeded" className="text-sm text-foreground/80 cursor-pointer">
                    Interpreter needed
                  </Label>
                </div>
              </div>

              {/* Communication Preference */}
              <div className="md:col-span-2">
                <FormLabel htmlFor="communicationPreference">Communication Preference</FormLabel>
                <RadioGroup
                  value={communicationPreference}
                  onValueChange={setCommunicationPreference}
                  className="mt-1 flex flex-wrap gap-4"
                >
                  {COMMUNICATION_OPTIONS.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <div key={option.value} className="flex items-center gap-2">
                        <RadioGroupItem value={option.value} id={`comm-${option.value}`} />
                        <Label
                          htmlFor={`comm-${option.value}`}
                          className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground/80"
                        >
                          <OptionIcon className="h-4 w-4 text-muted-foreground" />
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Section 8 — Consent (P2) */}
          <div className="border-b border-border p-6">
            <SectionHeader
              icon={FileCheck}
              title="Consent"
              note="Optional"
            />
            <div className="space-y-4">
              {/* HIPAA Privacy Notice */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hipaaConsent"
                    checked={hasHipaaConsent}
                    onCheckedChange={(checked) => {
                      setHasHipaaConsent(checked === true);
                      if (!checked) setHipaaSignedDate("");
                    }}
                  />
                  <Label htmlFor="hipaaConsent" className="text-sm text-foreground/80 cursor-pointer">
                    Patient has signed HIPAA Privacy Notice
                  </Label>
                </div>
                {hasHipaaConsent && (
                  <div className="ml-6 max-w-[200px]">
                    <FormLabel htmlFor="hipaaSignedDate">Date Signed</FormLabel>
                    <div className="relative">
                      <input
                        id="hipaaSignedDate"
                        type="date"
                        value={hipaaSignedDate}
                        onChange={(event) => setHipaaSignedDate(event.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className={INPUT_NORMAL}
                      />
                      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* AI Consent (Clara) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aiConsent"
                    checked={hasAiConsent}
                    onCheckedChange={(checked) => setHasAiConsent(checked === true)}
                  />
                  <Label htmlFor="aiConsent" className="text-sm text-foreground/80 cursor-pointer">
                    Patient consents to AI-assisted documentation (Clara)
                  </Label>
                </div>
                {!hasAiConsent && (
                  <div className={clsxMerge(
                    "ml-6 flex items-start gap-2 rounded-md p-3",
                    "bg-info-50 text-info-700",
                  )}>
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs">
                      Clara AI features will be limited without patient consent
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="flex flex-col-reverse gap-3 rounded-b-lg border-t border-border bg-muted p-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={isEditMode ? `/patients/${id}` : "/patients"}
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={(!isDirty && !hasExtraChanges) || isCreating || isUpdating}
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
