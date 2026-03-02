const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-secondary-100 text-secondary-700",
  "bg-accent-100 text-accent-700",
  "bg-success-100 text-success-700",
  "bg-warning-100 text-warning-700",
  "bg-info-100 text-info-700",
  "bg-error-100 text-error-700",
] as const;

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getAvatarColor(identifier: string): string {
  let hash = 0;
  for (let charIndex = 0; charIndex < identifier.length; charIndex++) {
    hash = identifier.charCodeAt(charIndex) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
}
