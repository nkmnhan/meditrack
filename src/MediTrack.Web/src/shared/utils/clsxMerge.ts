import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 *
 * Usage:
 *   clsxMerge("px-2 py-1", condition && "bg-blue-500", props.className)
 *
 * tailwind-merge ensures conflicting Tailwind classes are resolved correctly,
 * e.g. clsxMerge("px-4", "px-2") → "px-2" (last wins, no duplicate utilities)
 */
export function clsxMerge(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
