// Patient API response types matching backend DTOs

export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  planName?: string;
  effectiveDate?: string;
  expirationDate?: string;
}

export interface Patient {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string; // ISO 8601 date string
  age: number;
  gender: string;
  email: string;
  phoneNumber: string;
  address: Address | string; // Can be object or string for backwards compatibility
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  emergencyContact?: EmergencyContact | string; // Can be object or string
  insurance?: Insurance | string; // Can be object or string
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PatientListItem {
  id: string;
  medicalRecordNumber: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD format
  gender: string;
  socialSecurityNumber?: string;
  email: string;
  phoneNumber: string;
  address: Address;
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  emergencyContact?: EmergencyContact;
  insurance?: Insurance;
}

export interface UpdatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  socialSecurityNumber?: string;
  email: string;
  phoneNumber: string;
  address: Address;
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  emergencyContact?: EmergencyContact;
  insurance?: Insurance;
}

export interface PatientSearchParams {
  searchTerm: string;
}
