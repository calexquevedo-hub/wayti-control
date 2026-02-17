import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility used by shadcn/ui to compose class names safely.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
