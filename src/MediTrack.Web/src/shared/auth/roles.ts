export const UserRole = {
  Admin: "Admin",
  Doctor: "Doctor",
  Nurse: "Nurse",
  Receptionist: "Receptionist",
  Patient: "Patient",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const AllRoles: UserRoleType[] = Object.values(UserRole);

export const StaffRoles: UserRoleType[] = [
  UserRole.Admin,
  UserRole.Doctor,
  UserRole.Nurse,
  UserRole.Receptionist,
];

export const MedicalRoles: UserRoleType[] = [
  UserRole.Admin,
  UserRole.Doctor,
  UserRole.Nurse,
];
